import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createNotifications } from '../lib/notificationEvents'

function getStorageKey(userId) {
  return `arcana:notification-read:${userId}`
}

function readStoredIds(userId) {
  try {
    const stored = window.localStorage.getItem(getStorageKey(userId))
    const ids = stored ? JSON.parse(stored) : []

    return new Set(Array.isArray(ids) ? ids : [])
  } catch (error) {
    console.error('Não foi possível carregar as notificações lidas:', error)
    return new Set()
  }
}


export function useNotifications(userId) {
  const [centerState, setCenterState] = useState({
    userId: null,
    notifications: [],
    readIds: new Set(),
    error: '',
  })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!userId) return undefined

    let active = true
    let requestPending = false

    async function loadNotifications() {
      if (requestPending) return
      requestPending = true

      const storedIds = readStoredIds(userId)

      try {
        const results = await Promise.all([
          supabase
            .from('appointments')
            .select(`
              id,
              client_id,
              appointment_type,
              scheduled_at,
              status,
              clients ( name, phone ),
              services ( name )
            `)
            .eq('owner_id', userId),
          supabase
            .from('clients')
            .select('id, name, phone')
            .eq('owner_id', userId),
          supabase
            .from('loyalty_settings')
            .select('active, program_type')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('loyalty_rules')
            .select('id, rule_type, points_cost, reward_description, active')
            .eq('owner_id', userId),
          supabase
            .from('loyalty_transactions')
            .select('id, client_id, points, created_at')
            .eq('owner_id', userId),
        ])

        const failedResult = results.find((result) => result.error)

        if (failedResult?.error) throw failedResult.error
        if (!active) return

        const [appointments, clients, settings, rules, transactions] = results

        setCenterState((current) => ({
          userId,
          notifications: createNotifications({
            appointments: appointments.data || [],
            clients: clients.data || [],
            loyaltySettings: settings.data,
            loyaltyRules: rules.data || [],
            transactions: transactions.data || [],
          }),
          readIds:
            current.userId === userId ? current.readIds : storedIds,
          error: '',
        }))
      } catch (loadError) {
        if (!active) return

        console.error('Não foi possível carregar as notificações:', loadError)
        setCenterState((current) => ({
          userId,
          notifications:
            current.userId === userId ? current.notifications : [],
          readIds:
            current.userId === userId
              ? current.readIds
              : storedIds,
          error: loadError?.message || 'Erro inesperado.',
        }))
      } finally {
        requestPending = false
      }
    }

    loadNotifications()
    const intervalId = window.setInterval(loadNotifications, 60_000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [userId, refreshKey])

  const currentState =
    centerState.userId === userId
      ? centerState
      : { notifications: [], readIds: new Set(), error: '' }

  const unreadIds = useMemo(
    () =>
      new Set(
        currentState.notifications
          .filter((notification) => !currentState.readIds.has(notification.id))
          .map((notification) => notification.id),
      ),
    [currentState.notifications, currentState.readIds],
  )

  function updateReadIds(nextIds) {
    try {
      window.localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify([...nextIds]),
      )
      setCenterState((current) => ({
        ...current,
        readIds: nextIds,
        error: '',
      }))
    } catch (storageError) {
      console.error('Não foi possível salvar as notificações lidas:', storageError)
      setCenterState((current) => ({ ...current, error: 'storage' }))
    }
  }

  function markAsRead(id) {
    if (!userId || centerState.userId !== userId) return

    updateReadIds(new Set([...centerState.readIds, id]))
  }

  function markAllAsRead() {
    if (!userId || centerState.userId !== userId) return

    updateReadIds(new Set([
      ...centerState.readIds,
      ...centerState.notifications.map((notification) => notification.id),
    ]))
  }

  return {
    notifications: currentState.notifications,
    loading: Boolean(userId && centerState.userId !== userId),
    error: currentState.error,
    unreadIds,
    unreadCount: unreadIds.size,
    markAsRead,
    markAllAsRead,
    refresh: () => setRefreshKey((current) => current + 1),
  }
}
