
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { SpaceFormData } from "@/schemas/spaceSchema";
import { CATEGORY_OPTIONS } from "@/types/space";

export const RefactoredBasicInformation = () => {
  const form = useFormContext<SpaceFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informazioni Base</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                Titolo <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Inserisci un titolo descrittivo per il tuo spazio"
                  className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                Descrizione <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrivi il tuo spazio, l'atmosfera e cosa lo rende speciale..."
                  rows={4}
                  className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                Categoria <span className="text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={fieldState.error ? "border-red-500 focus:ring-red-500" : ""}>
                    <SelectValue placeholder="Seleziona una categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
