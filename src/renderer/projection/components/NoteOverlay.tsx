interface NoteOverlayProps {
  isVisible: boolean;
  content?: string;
  contentType?: 'text' | 'image';
  imagePath?: string;
  position?: 'top' | 'bottom';
}

export default function NoteOverlay({
  isVisible,
  content,
  contentType = 'text',
  imagePath,
  position = 'bottom',
}: NoteOverlayProps) {
  const positionStyles: React.CSSProperties =
    position === 'top'
      ? {
          top: 0,
          bottom: 'auto',
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        }
      : {
          bottom: 0,
          top: 'auto',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        };

  return (
    <div
      className="absolute left-0 right-0 z-40 pointer-events-none"
      style={{
        transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
        opacity: isVisible ? 1 : 0,
        ...positionStyles,
      }}
    >
      <div
        className="flex items-center justify-center w-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: '48px 64px',
        }}
      >
        {contentType === 'image' && imagePath ? (
          <img
            src={`file://${imagePath}`}
            alt=""
            style={{
              maxHeight: '120px',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div className="text-center">
            {content
              ?.split('\n')
              .filter((l) => l.trim())
              .map((line, i) => (
                <p
                  key={i} // eslint-disable-line react/no-array-index-key -- lines are positional
                  className="font-bold leading-tight text-white"
                  style={{ fontSize: '36px' }}
                >
                  {line}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
