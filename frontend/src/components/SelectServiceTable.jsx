import "../styling/components/ServiceTable.scss";

export default function SelectableServiceTable({
  services,
  selectedIds,
  onToggle,
  readOnly,
}) {
  return (
    <table className="w-full border text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 text-center">Apply</th>
          <th className="p-2 text-center">Name</th>
          <th className="p-2 text-center">Type</th>
          <th className="p-2 text-right">Price (VND)</th>
        </tr>
      </thead>
      <tbody>
        {services.map((s) => (
          <tr key={s._id || s.serviceId} className="border-t">
            <td className="p-2 text-center">
              <input
                type="checkbox"
                checked={selectedIds.includes(s._id || s.serviceId)}
                onChange={() => onToggle(s._id || s.serviceId)}
                disabled={readOnly}
              />
            </td>
            <td className="p-2">{s.name}</td>
            <td className="p-2 text-center">{s.type}</td>
            <td className="p-2 text-right">
              {s.unit_price?.toLocaleString() ?? s.price?.toLocaleString()}
            </td>
          </tr>
        ))}
        {services.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center p-4 text-gray-500">
              No active services found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
