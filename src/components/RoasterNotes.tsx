export default function RoasterNotes({ notes }: { notes?: string }) {
  if (!notes?.trim()) return null
  return (
    <p className="roaster-notes">
      <strong>Roaster flavour notes</strong>
      <span>{notes}</span>
    </p>
  )
}
