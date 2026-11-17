const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000

export function createNotifications({
  appointments,
  clients,
  loyaltySettings,
  loyaltyRules,
  transactions,
}) {
  const now = Date.now()
  const notifications = []
  const clientsById = new Map(
    clients.map((client) => [
      client.id,
      client.name?.trim() || client.phone || '',
    ]),
  )

  appointments.forEach((appointment) => {
    if (
      appointment.appointment_type !== 'scheduled' ||
      appointment.status === 'cancelled' ||
      appointment.status === 'completed'
    ) {
      return
    }

    const appointmentTime = new Date(appointment.scheduled_at).getTime()

    if (
      !Number.isFinite(appointmentTime) ||
      appointmentTime < now ||
      appointmentTime > now + REMINDER_WINDOW_MS
    ) {
      return
    }

    notifications.push({
      id: `appointment:${appointment.id}:${appointment.scheduled_at}`,
      kind: 'appointment',
      occurredAt: appointment.scheduled_at,
      clientName:
        appointment.clients?.name || appointment.clients?.phone || '',
      serviceName: appointment.services?.name || '',
    })
  })

  if (
    loyaltySettings?.active &&
    loyaltySettings.program_type === 'points'
  ) {
    const transactionsByClient = new Map()

    transactions.forEach((transaction) => {
      if (!transaction.client_id) return

      const clientTransactions =
        transactionsByClient.get(transaction.client_id) || []

      clientTransactions.push(transaction)
      transactionsByClient.set(transaction.client_id, clientTransactions)
    })

    const pointRules = loyaltyRules.filter(
      (rule) =>
        rule.active &&
        rule.rule_type === 'points' &&
        Number(rule.points_cost) > 0,
    )

    transactionsByClient.forEach((clientTransactions, clientId) => {
      clientTransactions.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      )

      pointRules.forEach((rule) => {
        let balance = 0
        const threshold = Number(rule.points_cost)

        clientTransactions.forEach((transaction) => {
          const previousBalance = balance
          balance += Number(transaction.points) || 0

          if (previousBalance < threshold && balance >= threshold) {
            notifications.push({
              id: `points:${clientId}:${rule.id}:${transaction.id}`,
              kind: 'points',
              occurredAt: transaction.created_at,
              clientId,
              clientName: clientsById.get(clientId) || '',
              points: balance,
              reward: rule.reward_description || '',
            })
          }
        })
      })
    })
  }

  return notifications.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() -
      new Date(a.occurredAt).getTime(),
  )
}
