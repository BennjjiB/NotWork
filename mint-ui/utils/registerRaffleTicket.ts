export async function registerRaffleTickets(pubAddress: string, tickets: number) {
  await fetch('/api/raffle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: pubAddress,
      tickets: tickets,
      date: Date.now()
    }),
  })
}

export async function getLeaderboard(address: string) {
  const response = await fetch('/api/raffle?address=' + address, {
    method: 'GET'
  })
  return await response.json()
}