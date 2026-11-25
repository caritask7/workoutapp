/** Mode entraînement plein écran, sans navigation. */
export default function FocusLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto min-h-dvh w-full max-w-3xl">{children}</div>;
}
