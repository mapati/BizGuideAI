import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Settings2 } from "lucide-react";
import type { AIGenerationParams } from "@shared/schema";
import { useRegisterAIModal } from "@/contexts/ai-modal-lock";

export interface FocoItem {
  value: string;
  label: string;
  desc?: string;
}

export interface FonteContextoItem {
  id: string;
  label: string;
  desc?: string;
  count?: number;
  alwaysIncluded?: boolean;
  disabled?: boolean;
}

export interface AIGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: AIGenerationParams) => void;

  title: string;
  description?: string;
  confirmLabel?: string;
  isGenerating?: boolean;
  testIdPrefix?: string;

  /** Configuração da quantidade. Se omitido, não exibe seletor. */
  quantidade?: {
    label: string;
    description?: string;
    min?: number;
    max?: number;
    default: number;
    suffixSingular?: string;
    suffixPlural?: string;
  };

  /** Quantidade secundária (ex.: métricas por objetivo). Se omitido, não exibe. */
  quantidadeSecundaria?: {
    label: string;
    description?: string;
    min?: number;
    max?: number;
    default: number;
    suffixSingular?: string;
    suffixPlural?: string;
  };

  /** Lista de focos (quadrantes/perspectivas/prioridades/...). */
  foco?: {
    label: string;
    description?: string;
    items: FocoItem[];
    defaultSelected?: string[];
    /** Se true (padrão), exige ao menos um foco selecionado para confirmar. */
    requireAtLeastOne?: boolean;
  };

  /** Segunda dimensão de foco (ex.: prazo, tipo de métrica). */
  focoSecundario?: {
    label: string;
    description?: string;
    items: FocoItem[];
    defaultSelected?: string[];
  };

  /** Fontes de contexto opcionais (com badges de contagem). */
  fontesContexto?: {
    label?: string;
    items: FonteContextoItem[];
    defaultSelected?: string[];
  };

  /** Campo de instruções adicionais (textarea). */
  instrucaoAdicional?: {
    label?: string;
    placeholder?: string;
  };

  /** ID de origem (objetivoId, estrategiaId etc.) — passado adiante em onConfirm. */
  origemId?: string;

  /**
   * Seletor de "Origem" — quando fornecido, exibe um Select dentro da modal
   * para escolher o item de origem (ex.: Estratégia, Oportunidade, Iniciativa).
   * Quando `required: true`, o botão Confirmar fica desabilitado até haver seleção.
   */
  origem?: {
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    items: { id: string; label: string; group?: string }[];
    defaultId?: string;
    emptyMessage?: string;
  };
}

export function AIGenerationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Gerar",
  isGenerating = false,
  testIdPrefix = "ai-modal",
  quantidade,
  quantidadeSecundaria,
  foco,
  focoSecundario,
  fontesContexto,
  instrucaoAdicional,
  origemId,
  origem,
}: AIGenerationModalProps) {
  const [qtd, setQtd] = useState<number>(quantidade?.default ?? 3);
  const [qtdSec, setQtdSec] = useState<number>(quantidadeSecundaria?.default ?? 3);
  const [focoSel, setFocoSel] = useState<Record<string, boolean>>({});
  const [focoSecSel, setFocoSecSel] = useState<Record<string, boolean>>({});
  const [fontesSel, setFontesSel] = useState<Record<string, boolean>>({});
  const [instrucao, setInstrucao] = useState("");
  const [origemSel, setOrigemSel] = useState<string>("");

  // Reset state quando o modal abre
  useEffect(() => {
    if (!open) return;
    setQtd(quantidade?.default ?? 3);
    setQtdSec(quantidadeSecundaria?.default ?? 3);
    if (foco) {
      const def = new Set(foco.defaultSelected ?? foco.items.map((i) => i.value));
      const initial: Record<string, boolean> = {};
      foco.items.forEach((i) => { initial[i.value] = def.has(i.value); });
      setFocoSel(initial);
    } else {
      setFocoSel({});
    }
    if (focoSecundario) {
      const def = new Set(focoSecundario.defaultSelected ?? focoSecundario.items.map((i) => i.value));
      const initial: Record<string, boolean> = {};
      focoSecundario.items.forEach((i) => { initial[i.value] = def.has(i.value); });
      setFocoSecSel(initial);
    } else {
      setFocoSecSel({});
    }
    if (fontesContexto) {
      const def = new Set(
        fontesContexto.defaultSelected ??
          fontesContexto.items.filter((i) => !i.disabled).map((i) => i.id)
      );
      const initial: Record<string, boolean> = {};
      fontesContexto.items.forEach((i) => {
        initial[i.id] = i.alwaysIncluded ? true : def.has(i.id) && !i.disabled;
      });
      setFontesSel(initial);
    } else {
      setFontesSel({});
    }
    setInstrucao("");
    if (origem) {
      setOrigemSel(origem.defaultId ?? origemId ?? "");
    } else {
      setOrigemSel("");
    }
  }, [open]);

  const algumFoco = useMemo(() => Object.values(focoSel).some(Boolean), [focoSel]);
  const requireFoco = foco?.requireAtLeastOne !== false;
  const origemRequiredOk = !origem?.required || !!origemSel;
  const podeConfirmar = !isGenerating && (!foco || !requireFoco || algumFoco) && origemRequiredOk;

  const handleConfirm = () => {
    const params: AIGenerationParams = {};
    if (quantidade) params.quantidade = qtd;
    if (quantidadeSecundaria) params.quantidadeSecundaria = qtdSec;
    if (foco) {
      params.foco = Object.entries(focoSel).filter(([, v]) => v).map(([k]) => k);
    }
    if (focoSecundario) {
      params.focoSecundario = Object.entries(focoSecSel).filter(([, v]) => v).map(([k]) => k);
    }
    if (fontesContexto) {
      params.fontesContexto = Object.entries(fontesSel)
        .filter(([, v]) => v)
        .map(([k]) => k);
    }
    if (instrucaoAdicional) {
      const trimmed = instrucao.trim();
      if (trimmed) params.instrucaoAdicional = trimmed;
    }
    const origemFinal = origemSel || origemId;
    if (origemFinal) params.origemId = origemFinal;
    onConfirm(params);
  };

  useRegisterAIModal(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground pt-1">{description}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Origem (item pai da cascata estratégica) */}
          {origem && (
            <div data-testid={`${testIdPrefix}-section-origem`}>
              <Label className="text-sm font-medium mb-1 block">
                {origem.label}
                {origem.required ? (
                  <span className="text-destructive ml-1">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                )}
              </Label>
              {origem.description && (
                <p className="text-xs text-muted-foreground mb-2">{origem.description}</p>
              )}
              {origem.items.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {origem.emptyMessage ?? "Nenhuma opção disponível. Crie um item na etapa anterior antes de continuar."}
                </p>
              ) : (
                <Select value={origemSel || undefined} onValueChange={(v) => setOrigemSel(v)}>
                  <SelectTrigger data-testid={`${testIdPrefix}-select-origem`}>
                    <SelectValue placeholder={origem.placeholder ?? "Selecione…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {origem.items.map((it) => (
                      <SelectItem key={it.id} value={it.id} data-testid={`${testIdPrefix}-option-origem-${it.id}`}>
                        {it.group ? <span className="text-muted-foreground mr-1">[{it.group}]</span> : null}
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Quantidade + Foco */}
          {(quantidade || foco) && (
            <div className="space-y-3">
              {(quantidade && foco) ? (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <Label className="text-sm font-medium">{foco.label}</Label>
                    {foco.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{foco.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label
                      htmlFor={`${testIdPrefix}-select-quantidade`}
                      className="text-sm text-muted-foreground whitespace-nowrap"
                    >
                      {quantidade.label}:
                    </Label>
                    <QuantidadeSelect
                      value={qtd}
                      onValueChange={setQtd}
                      min={quantidade.min ?? 1}
                      max={quantidade.max ?? 5}
                      suffixSingular={quantidade.suffixSingular ?? "opção"}
                      suffixPlural={quantidade.suffixPlural ?? "opções"}
                      testId={`${testIdPrefix}-select-quantidade`}
                    />
                  </div>
                </div>
              ) : quantidade ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-medium">{quantidade.label}</Label>
                    {quantidade.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{quantidade.description}</p>
                    )}
                  </div>
                  <QuantidadeSelect
                    value={qtd}
                    onValueChange={setQtd}
                    min={quantidade.min ?? 1}
                    max={quantidade.max ?? 5}
                    suffixSingular={quantidade.suffixSingular ?? "opção"}
                    suffixPlural={quantidade.suffixPlural ?? "opções"}
                    testId={`${testIdPrefix}-select-quantidade`}
                  />
                </div>
              ) : foco ? (
                <div>
                  <Label className="text-sm font-medium">{foco.label}</Label>
                  {foco.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{foco.description}</p>
                  )}
                </div>
              ) : null}

              {quantidadeSecundaria && (
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div>
                    <Label className="text-sm font-medium">{quantidadeSecundaria.label}</Label>
                    {quantidadeSecundaria.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{quantidadeSecundaria.description}</p>
                    )}
                  </div>
                  <QuantidadeSelect
                    value={qtdSec}
                    onValueChange={setQtdSec}
                    min={quantidadeSecundaria.min ?? 1}
                    max={quantidadeSecundaria.max ?? 5}
                    suffixSingular={quantidadeSecundaria.suffixSingular ?? "opção"}
                    suffixPlural={quantidadeSecundaria.suffixPlural ?? "opções"}
                    testId={`${testIdPrefix}-select-quantidade-secundaria`}
                  />
                </div>
              )}

              {foco && (
                <div className="space-y-2">
                  {foco.items.map((q) => (
                    <div
                      key={q.value}
                      className="flex items-center gap-2 py-1"
                      data-testid={`${testIdPrefix}-row-foco-${q.value}`}
                    >
                      <Checkbox
                        id={`${testIdPrefix}-foco-${q.value}`}
                        checked={!!focoSel[q.value]}
                        onCheckedChange={(c) =>
                          setFocoSel((prev) => ({ ...prev, [q.value]: !!c }))
                        }
                        data-testid={`${testIdPrefix}-checkbox-foco-${q.value}`}
                      />
                      <label
                        htmlFor={`${testIdPrefix}-foco-${q.value}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        <span className="font-medium">{q.label}</span>
                        {q.desc && (
                          <span className="text-muted-foreground ml-1">— {q.desc}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Foco secundário (ex.: prazo, tipo de métrica) */}
          {focoSecundario && (
            <div className="space-y-2" data-testid={`${testIdPrefix}-section-foco-secundario`}>
              <div>
                <Label className="text-sm font-medium">{focoSecundario.label}</Label>
                {focoSecundario.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{focoSecundario.description}</p>
                )}
              </div>
              <div className="space-y-2">
                {focoSecundario.items.map((q) => (
                  <div
                    key={q.value}
                    className="flex items-center gap-2 py-1"
                    data-testid={`${testIdPrefix}-row-foco-sec-${q.value}`}
                  >
                    <Checkbox
                      id={`${testIdPrefix}-foco-sec-${q.value}`}
                      checked={!!focoSecSel[q.value]}
                      onCheckedChange={(c) =>
                        setFocoSecSel((prev) => ({ ...prev, [q.value]: !!c }))
                      }
                      data-testid={`${testIdPrefix}-checkbox-foco-sec-${q.value}`}
                    />
                    <label
                      htmlFor={`${testIdPrefix}-foco-sec-${q.value}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      <span className="font-medium">{q.label}</span>
                      {q.desc && (
                        <span className="text-muted-foreground ml-1">— {q.desc}</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fontes de contexto */}
          {fontesContexto && (
            <div data-testid={`${testIdPrefix}-section-fontes-contexto`}>
              <Label className="text-sm font-medium mb-2 block">
                {fontesContexto.label ?? "Fontes de contexto"}
              </Label>
              <div className="space-y-2">
                {fontesContexto.items.map((fonte) => {
                  const hasCount = fonte.count !== undefined;
                  const count = fonte.count ?? 0;
                  const isAlways = !!fonte.alwaysIncluded;
                  // Auto-disable by count only when caller explicitly provided a count of 0.
                  const isDisabled = !!fonte.disabled || (hasCount && count === 0 && !isAlways);
                  return (
                    <div
                      key={fonte.id}
                      className={`flex items-center justify-between gap-2 py-1 ${isDisabled && !isAlways ? "opacity-50" : ""}`}
                      data-testid={`${testIdPrefix}-row-fonte-${fonte.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${testIdPrefix}-fonte-${fonte.id}`}
                          checked={isAlways ? true : !!fontesSel[fonte.id]}
                          disabled={isAlways || isDisabled}
                          onCheckedChange={(c) =>
                            !isAlways && !isDisabled &&
                            setFontesSel((prev) => ({ ...prev, [fonte.id]: !!c }))
                          }
                          data-testid={`${testIdPrefix}-checkbox-fonte-${fonte.id}`}
                        />
                        <label
                          htmlFor={`${testIdPrefix}-fonte-${fonte.id}`}
                          className={`text-sm select-none ${isAlways || isDisabled ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <span className="font-medium">{fonte.label}</span>
                          {fonte.desc && (
                            <span className="text-muted-foreground ml-1">— {fonte.desc}</span>
                          )}
                          {isAlways && (
                            <span className="text-muted-foreground ml-1 text-xs">(sempre incluído)</span>
                          )}
                        </label>
                      </div>
                      {hasCount && (
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0"
                          data-testid={`${testIdPrefix}-badge-count-${fonte.id}`}
                        >
                          {count} {count === 1 ? "item" : "itens"}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Instruções adicionais */}
          {instrucaoAdicional && (
            <div>
              <Label
                htmlFor={`${testIdPrefix}-instrucao-adicional`}
                className="text-sm font-medium mb-1 block"
              >
                {instrucaoAdicional.label ?? "Instruções adicionais"}{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id={`${testIdPrefix}-instrucao-adicional`}
                placeholder={instrucaoAdicional.placeholder ?? "Ex: Priorize ações de baixo investimento e execução pela equipe atual."}
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                className="min-h-[90px] resize-none text-sm"
                data-testid={`${testIdPrefix}-textarea-instrucao-adicional`}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${testIdPrefix}-button-cancelar`}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!podeConfirmar}
            data-testid={`${testIdPrefix}-button-confirmar`}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? "Gerando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuantidadeSelect({
  value,
  onValueChange,
  min,
  max,
  suffixSingular,
  suffixPlural,
  testId,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  suffixSingular: string;
  suffixPlural: string;
  testId: string;
}) {
  const opts: number[] = [];
  for (let i = min; i <= max; i++) opts.push(i);
  return (
    <Select value={String(value)} onValueChange={(v) => onValueChange(Number(v))}>
      <SelectTrigger className="w-28" id={testId} data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n} {n === 1 ? suffixSingular : suffixPlural}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
