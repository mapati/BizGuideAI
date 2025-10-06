import { PageHeader } from "../PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PageHeaderExample() {
  return (
    <div className="p-8">
      <PageHeader
        title="Análise PESTEL"
        description="Identifique os principais fatores externos que impactam seu negócio: Políticos, Econômicos, Sociais, Tecnológicos, Ambientais e Legais."
        tooltip="PESTEL é uma ferramenta que ajuda você a mapear o ambiente externo da sua empresa e antecipar mudanças importantes."
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Fator
          </Button>
        }
      />
    </div>
  );
}
