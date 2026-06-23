export function AlertBanner({ message }: { message: string }) {
  return (
    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 18, padding: 14, color: '#92400e', marginBottom: 20 }}>
      {message}
    </div>
  );
}
