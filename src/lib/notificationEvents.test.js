import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createNotifications } from './notificationEvents.js'

describe('createNotifications', () => {
  it('only includes scheduled appointments within the next 24 hours', () => {
    const now = Date.now()
    const notifications = createNotifications({
      appointments: [
        {
          id: 'soon',
          appointment_type: 'scheduled',
          scheduled_at: new Date(now + 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
        {
          id: 'later',
          appointment_type: 'scheduled',
          scheduled_at: new Date(now + 25 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
        {
          id: 'cancelled',
          appointment_type: 'scheduled',
          scheduled_at: new Date(now + 60 * 60 * 1000).toISOString(),
          status: 'cancelled',
        },
        {
          id: 'deadline',
          appointment_type: 'deadline',
          scheduled_at: new Date(now + 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
      ],
      clients: [],
      loyaltySettings: null,
      loyaltyRules: [],
      transactions: [],
    })

    assert.deepEqual(notifications.map(({ id }) => id), [
      `appointment:soon:${new Date(now + 60 * 60 * 1000).toISOString()}`,
    ])
  })

  it('notifies whenever a client crosses an active points redemption limit', () => {
    const notifications = createNotifications({
      appointments: [],
      clients: [{ id: 'client-1', name: 'Ana' }],
      loyaltySettings: { active: true, program_type: 'points' },
      loyaltyRules: [{
        id: 'rule-1',
        active: true,
        rule_type: 'points',
        threshold: 100,
        points_cost: 5,
        reward_description: 'Consulta bônus',
      }],
      transactions: [
        {
          id: 'first',
          client_id: 'client-1',
          points: 6,
          created_at: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 'redeem',
          client_id: 'client-1',
          points: -6,
          created_at: '2026-01-02T10:00:00.000Z',
        },
        {
          id: 'second',
          client_id: 'client-1',
          points: 5,
          created_at: '2026-01-03T10:00:00.000Z',
        },
      ],
    })

    assert.deepEqual(
      notifications.map(({ id, clientName, points }) => ({
        id,
        clientName,
        points,
      })),
      [
        {
          id: 'points:client-1:rule-1:second',
          clientName: 'Ana',
          points: 5,
        },
        {
          id: 'points:client-1:rule-1:first',
          clientName: 'Ana',
          points: 6,
        },
      ],
    )
  })

  it('does not send points notifications when the program or rule is inactive', () => {
    const disabledProgramNotifications = createNotifications({
      appointments: [],
      clients: [],
      loyaltySettings: { active: false, program_type: 'points' },
      loyaltyRules: [{
        id: 'rule-1',
        active: true,
        rule_type: 'points',
        points_cost: 5,
      }],
      transactions: [{
        id: 'earned',
        client_id: 'client-1',
        points: 10,
        created_at: '2026-01-01T10:00:00.000Z',
      }],
    })

    const disabledRuleNotifications = createNotifications({
      appointments: [],
      clients: [],
      loyaltySettings: { active: true, program_type: 'points' },
      loyaltyRules: [{
        id: 'rule-1',
        active: false,
        rule_type: 'points',
        points_cost: 5,
      }],
      transactions: [{
        id: 'earned',
        client_id: 'client-1',
        points: 10,
        created_at: '2026-01-01T10:00:00.000Z',
      }],
    })

    assert.deepEqual(disabledProgramNotifications, [])
    assert.deepEqual(disabledRuleNotifications, [])
  })
})
