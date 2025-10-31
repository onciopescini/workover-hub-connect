import { PropsWithChildren } from "react";

/**
 * ThreadsLayoutStitch
 * 
 * Layout 2-colonne da centro_messaggi_(message_center)_/code.html
 * Colonna sx: ConversationSidebar (lista), dx: MessagesChatArea
 */
export default function ThreadsLayoutStitch({ children }: PropsWithChildren) {
  return (
    <div className="container mx-auto px-4 py-6 grid gap-4 md:grid-cols-[320px_1fr] bg-stitch-bg">
      {children}
    </div>
  );
}
