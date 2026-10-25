import AdminPasswordModal from './AdminPasswordModal';

export default function DeletePasswordModal({
  open,
  count,
  onCancel,
  onConfirm,
  busy,
  error,
}) {
  return (
    <AdminPasswordModal
      open={open}
      title={`Delete ${count} song${count === 1 ? '' : 's'}?`}
      subtitle="Admin password required to confirm deletion."
      actionLabel={count > 1 ? `Delete (${count})` : 'Delete Song'}
      danger={true}
      busy={busy}
      onCancel={onCancel}
      onSuccess={onConfirm}
    />
  );
}
