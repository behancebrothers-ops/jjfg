import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Loader2 } from "lucide-react";

export const BulkEmailTool = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const fetchSubscriberCount = async () => {
    try {
      setIsLoadingCount(true);
      const { count, error } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('subscribed', true);
      
      if (error) throw error;
      setSubscriberCount(count || 0);
    } catch (error) {
      console.error('Error fetching subscriber count:', error);
      toast.error('Failed to fetch subscriber count');
    } finally {
      setIsLoadingCount(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }

    try {
      setIsSending(true);
      
      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject,
          message,
        },
      });

      if (error) throw error;

      toast.success(`Campaign sent successfully to ${data.sent_count} subscribers!`);
      setSubject("");
      setMessage("");
      setSubscriberCount(null);
    } catch (error) {
      console.error('Error sending bulk email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Bulk Email Campaign
        </CardTitle>
        <CardDescription>
          Send promotional emails to all newsletter subscribers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Email Subject</Label>
          <Input
            id="subject"
            placeholder="Enter email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Email Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your promotional message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            rows={8}
            className="resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="space-y-1">
            {subscriberCount !== null ? (
              <p className="text-sm text-muted-foreground">
                Recipients: <span className="font-semibold text-foreground">{subscriberCount} subscribers</span>
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubscriberCount}
                disabled={isLoadingCount}
              >
                {isLoadingCount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Check Subscriber Count'
                )}
              </Button>
            )}
          </div>

          <Button
            onClick={handleSendBulkEmail}
            disabled={isSending || !subject.trim() || !message.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
