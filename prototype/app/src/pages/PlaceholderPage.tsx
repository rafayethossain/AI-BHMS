import { useLocation } from 'react-router-dom';

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-heading">{pathname}</h1>
      <p className="text-muted mt-2 text-sm">
        This screen is not built yet in the prototype. Built screens land here as P0–P4 slices ship.
      </p>
    </div>
  );
}