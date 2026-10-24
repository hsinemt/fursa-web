/** Simple placeholder until the real screen is built in its own step. */
export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl">{title}</h1>
      <p className="mt-2 text-slate">{description}</p>
      {children}
    </div>
  );
}
