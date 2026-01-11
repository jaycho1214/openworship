interface BlankScreenProps {
  isBlank: boolean;
}

export default function BlankScreen({ isBlank }: BlankScreenProps) {
  return (
    <div
      className="absolute inset-0 bg-black z-50 pointer-events-none"
      style={{
        opacity: isBlank ? 1 : 0,
        transition: 'opacity 300ms ease-in-out',
      }}
    />
  );
}
