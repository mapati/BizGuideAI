import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface OrigemOpcao {
  id: string;
  label: string;
  grupo?: string;
}

interface OrigemSelectorProps {
  label: string;
  ajuda?: string;
  obrigatorio: boolean;
  opcoes: OrigemOpcao[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
  permitirSemOrigem?: boolean;
}

export function OrigemSelector({
  label,
  ajuda,
  obrigatorio,
  opcoes,
  value,
  onChange,
  placeholder = "Selecione a origem",
  testId = "select-origem",
  permitirSemOrigem = true,
}: OrigemSelectorProps) {
  const grupos = Array.from(new Set(opcoes.map(o => o.grupo).filter(Boolean))) as string[];
  const semGrupo = opcoes.filter(o => !o.grupo);

  return (
    <div>
      <Label htmlFor={testId} className={obrigatorio ? "after:content-['_*'] after:text-destructive" : ""}>
        {label}
        {!obrigatorio && <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span>}
      </Label>
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger id={testId} data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {permitirSemOrigem && !obrigatorio && (
            <SelectItem value="__none__" data-testid={`${testId}-none`}>
              <span className="text-muted-foreground">Sem origem (não conectado)</span>
            </SelectItem>
          )}
          {grupos.map((g) => (
            <div key={g}>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{g}</div>
              {opcoes.filter(o => o.grupo === g).map(o => (
                <SelectItem key={o.id} value={o.id} data-testid={`${testId}-option-${o.id}`}>
                  {o.label}
                </SelectItem>
              ))}
            </div>
          ))}
          {semGrupo.map(o => (
            <SelectItem key={o.id} value={o.id} data-testid={`${testId}-option-${o.id}`}>
              {o.label}
            </SelectItem>
          ))}
          {opcoes.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma opção disponível</div>
          )}
        </SelectContent>
      </Select>
      {ajuda && <p className="text-xs text-muted-foreground mt-1">{ajuda}</p>}
    </div>
  );
}
