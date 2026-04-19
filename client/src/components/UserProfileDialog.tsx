import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Moon, Save, Sun, Trash2, X } from "lucide-react";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_DIMENSION = 256;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB upload limit before resize

async function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(user?.nome || "");
      setFotoUrl(user?.fotoUrl ?? null);
    }
  }, [open, user]);

  const initials = nome
    ? nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "A imagem deve ter no máximo 5 MB.", variant: "destructive" });
      return;
    }
    setIsProcessingImage(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setFotoUrl(dataUrl);
    } catch (err: any) {
      toast({ title: "Erro ao processar imagem", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemovePhoto = () => {
    setFotoUrl(null);
  };

  const handleSave = async () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        nome: nomeTrim,
        fotoUrl: fotoUrl ?? null,
      });
      toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isSaving) onOpenChange(o); }}>
      <DialogContent className="max-w-md" data-testid="dialog-user-profile">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>
            Edite suas informações pessoais e preferências.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-foto-file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage || isSaving}
                data-testid="button-upload-foto"
              >
                {isProcessingImage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {fotoUrl ? "Trocar foto" : "Adicionar foto"}
              </Button>
              {fotoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={isProcessingImage || isSaving}
                  data-testid="button-remove-foto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-nome">Nome</Label>
            <Input
              id="profile-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              disabled={isSaving}
              data-testid="input-profile-nome"
            />
          </div>

          {/* Email (somente leitura) */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              value={user?.email || ""}
              disabled
              data-testid="input-profile-email"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado por aqui.
            </p>
          </div>

          {/* Tema */}
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTheme("light")}
                className={`toggle-elevate ${theme === "light" ? "toggle-elevated" : ""}`}
                data-testid="button-tema-claro"
              >
                <Sun className="h-4 w-4 mr-2" />
                Claro
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTheme("dark")}
                className={`toggle-elevate ${theme === "dark" ? "toggle-elevated" : ""}`}
                data-testid="button-tema-escuro"
              >
                <Moon className="h-4 w-4 mr-2" />
                Escuro
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid="button-cancel-profile"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isProcessingImage}
            data-testid="button-save-profile"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
