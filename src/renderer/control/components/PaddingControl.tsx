import { useTranslation } from 'react-i18next';
import { Label } from '../../components/ui/label';
import { Slider } from '../../components/ui/slider';

export interface PaddingControlProps {
  padding: { top: number; right: number; bottom: number; left: number };
  onChange: (padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }) => void;
}

export default function PaddingControl({
  padding,
  onChange,
}: PaddingControlProps) {
  const { t } = useTranslation();

  const updatePadding = (key: keyof typeof padding, value: number) => {
    onChange({ ...padding, [key]: value });
  };

  return (
    <div className="space-y-3">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {t('adPadding')}
      </Label>

      {/* Visual box representation */}
      <div className="relative p-4 bg-muted/30 rounded-lg border border-border">
        {/* Center box representing content */}
        <div className="relative mx-auto w-32 h-20 bg-muted rounded border border-border flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">
            {t('adContent')}
          </span>

          {/* Top value */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <input
              type="number"
              value={padding.top}
              onChange={(e) => updatePadding('top', Number(e.target.value))}
              className="w-10 h-5 text-[10px] text-center font-mono bg-background border border-border rounded focus:border-foreground/30 focus:outline-none"
            />
          </div>

          {/* Bottom value */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <input
              type="number"
              value={padding.bottom}
              onChange={(e) => updatePadding('bottom', Number(e.target.value))}
              className="w-10 h-5 text-[10px] text-center font-mono bg-background border border-border rounded focus:border-foreground/30 focus:outline-none"
            />
          </div>

          {/* Left value */}
          <div className="absolute top-1/2 -left-5 -translate-y-1/2">
            <input
              type="number"
              value={padding.left}
              onChange={(e) => updatePadding('left', Number(e.target.value))}
              className="w-10 h-5 text-[10px] text-center font-mono bg-background border border-border rounded focus:border-foreground/30 focus:outline-none"
            />
          </div>

          {/* Right value */}
          <div className="absolute top-1/2 -right-5 -translate-y-1/2">
            <input
              type="number"
              value={padding.right}
              onChange={(e) => updatePadding('right', Number(e.target.value))}
              className="w-10 h-5 text-[10px] text-center font-mono bg-background border border-border rounded focus:border-foreground/30 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sliders below for fine control */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-8 capitalize">
              {t(
                `adPadding${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof typeof t,
              )}
            </span>
            <Slider
              value={[padding[side]]}
              onValueChange={([v]) => updatePadding(side, v)}
              max={200}
              step={4}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
