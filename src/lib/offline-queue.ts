
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from "./sre-logger";
import { toast } from "sonner";

interface QueuedMessage {
  id: string;
  conversationType: 'booking' | 'private';
  conversationId: string;
  content: string;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'workover_offline_messages';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export class OfflineMessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;

  constructor() {
    this.loadQueue();
    this.startProcessing();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        sreLogger.info(`Loaded ${this.queue.length} queued messages from storage`);
      }
    } catch (error) {
      sreLogger.error('Failed to load offline message queue', {}, error as Error);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      sreLogger.error('Failed to save offline message queue', {}, error as Error);
    }
  }

  addMessage(
    conversationType: 'booking' | 'private',
    conversationId: string,
    content: string
  ): string {
    const queuedMessage: QueuedMessage = {
      id: crypto.randomUUID(),
      conversationType,
      conversationId,
      content,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(queuedMessage);
    this.saveQueue();
    
    sreLogger.info('Message queued for offline sending', {
      id: queuedMessage.id,
      conversationType,
      conversationId
    });

    // Trigger processing
    this.processQueue();

    return queuedMessage.id;
  }

  private startProcessing() {
    // Check for queued messages periodically
    setInterval(() => {
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, 5000);

    // Process on connection restore
    window.addEventListener('online', () => {
      sreLogger.info('Connection restored, processing offline queue');
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue[0];
      
      if (!message) break;

      try {
        await this.sendMessage(message);
        
        // Success - remove from queue
        this.queue.shift();
        this.saveQueue();
        
        toast.success('Messaggio offline inviato');
        sreLogger.info('Queued message sent successfully', { id: message.id });
      } catch (error) {
        message.retryCount++;
        
        if (message.retryCount >= MAX_RETRIES) {
          // Max retries reached - remove and notify
          this.queue.shift();
          this.saveQueue();
          
          toast.error('Impossibile inviare messaggio offline. Riprova più tardi.');
          sreLogger.error('Failed to send queued message after max retries', {
            id: message.id,
            retryCount: message.retryCount
          }, error as Error);
        } else {
          // Will retry later
          this.saveQueue();
          sreLogger.warn('Failed to send queued message, will retry', {
            id: message.id,
            retryCount: message.retryCount
          });
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
        
        break; // Stop processing on error
      }
    }

    this.processing = false;
  }

  private async sendMessage(message: QueuedMessage): Promise<void> {
    const { conversationType, conversationId, content } = message;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('User not authenticated');

    if (conversationType === 'booking') {
      const { error } = await supabase
        .from('messages')
        .insert([{
          booking_id: conversationId,
          sender_id: user.id,
          content
        }]);

      if (error) throw error;
    } else if (conversationType === 'private') {
      const { error } = await supabase
        .from('private_messages')
        .insert([{
          chat_id: conversationId,
          sender_id: user.id,
          content
        }]);

      if (error) throw error;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
    sreLogger.info('Offline message queue cleared');
  }
}

// Singleton instance
export const offlineMessageQueue = new OfflineMessageQueue();
