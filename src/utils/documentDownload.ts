import { supabase } from "@/integrations/supabase/client";

export const downloadDocumentFromStorage = async (
  filePath: string,
  fileName: string
) => {
  try {
    // Extract bucket and path from filePath
    // Format: "bucket-name/path/to/file.pdf"
    const pathParts = filePath.split("/");
    const bucket = pathParts[0] || "";
    const path = pathParts.slice(1).join("/");

    if (!bucket || !path) {
      throw new Error("Percorso file non valido");
    }

    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error) throw error;

    // Create blob URL and trigger download
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error: any) {
    console.error("Download error:", error);
    throw new Error("Impossibile scaricare il documento: " + error.message);
  }
};
