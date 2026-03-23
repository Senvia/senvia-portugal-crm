import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGenerateProspects } from "@/hooks/useProspects";
import { Loader2, Search } from "lucide-react";

interface GenerateProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function GenerateProspectsDialog({ open, onOpenChange, organizationId }: GenerateProspectsDialogProps) {
  const [searchStrings, setSearchStrings] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(50);
  const [language, setLanguage] = useState("pt");
  const [skipClosed, setSkipClosed] = useState(true);

  const generateMutation = useGenerateProspects();

  const handleGenerate = () => {
    const strings = searchStrings
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!strings.length || !location.trim()) return;

    generateMutation.mutate(
      {
        organizationId,
        searchStrings: strings,
        location: location.trim(),
        maxResults,
        language,
        skipClosed,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSearchStrings("");
          setLocation("");
          setMaxResults(50);
        },
      }
    );
  };

  const isValid = searchStrings.trim().length > 0 && location.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen">
        <DialogHeader>
          <DialogTitle>Gerar Prospects</DialogTitle>
          <DialogDescription>
            Extraia empresas do Google Maps configurando os parâmetros de busca abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="search-strings">Termos de pesquisa</Label>
            <Textarea
              id="search-strings"
              placeholder={"restaurante\ncabeleireiro\nclínica dentária"}
              value={searchStrings}
              onChange={(e) => setSearchStrings(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Um termo por linha. Ex: "restaurante", "cabeleireiro"</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização</Label>
            <Input
              id="location"
              placeholder="Lisboa, Portugal"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-results">Máximo de resultados</Label>
              <Input
                id="max-results"
                type="number"
                min={1}
                max={500}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground">Por termo de pesquisa</p>
            </div>

            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Ignorar locais fechados</p>
              <p className="text-xs text-muted-foreground">Exclui empresas permanentemente encerradas</p>
            </div>
            <Switch checked={skipClosed} onCheckedChange={setSkipClosed} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generateMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={!isValid || generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Gerar Prospects
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
