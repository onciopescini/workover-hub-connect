
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Flag } from "lucide-react";
import { createReport } from "@/lib/report-utils";
import { REPORT_REASONS } from "@/types/report";
import { ReportFormSchema, ReportFormData } from "@/schemas/reportSchema";

interface RefactoredReportDialogProps {
  targetType: "user" | "space" | "booking" | "event" | "message";
  targetId: string;
  triggerText?: string;
  className?: string;
}

const RefactoredReportDialog = ({ 
  targetType, 
  targetId, 
  triggerText = "Segnala", 
  className 
}: RefactoredReportDialogProps) => {
  const [open, setOpen] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(ReportFormSchema),
    defaultValues: {
      reason: "",
      description: ""
    }
  });

  const onSubmit = async (data: ReportFormData) => {
    const success = await createReport({
      target_type: targetType,
      target_id: targetId,
      reason: data.reason as any,
      description: data.description
    });

    if (success) {
      setOpen(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Flag className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Segnala contenuto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo della segnalazione *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REPORT_REASONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione aggiuntiva (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Fornisci dettagli aggiuntivi sulla segnalazione..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {form.formState.isSubmitting ? "Invio..." : "Invia segnalazione"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RefactoredReportDialog;
