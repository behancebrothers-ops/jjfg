import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle } from "lucide-react";

const Unsubscribe = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-unsubscribe', {
        body: { email }
      });

      if (error) throw error;

      setIsUnsubscribed(true);
      toast.success(data.message || "Successfully unsubscribed from newsletter.");
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      toast.error(error.message || "Failed to unsubscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16 flex-1">
        <div className="max-w-md mx-auto text-center space-y-8">
          {!isUnsubscribed ? (
            <>
              <div className="inline-block p-4 bg-primary/10 rounded-full">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-3xl font-bold">Unsubscribe from Newsletter</h1>
                <p className="text-muted-foreground">
                  We're sorry to see you go. Enter your email address to unsubscribe from our newsletter.
                </p>
              </div>

              <form onSubmit={handleUnsubscribe} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="text-center"
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                  variant="destructive"
                >
                  {isSubmitting ? "Unsubscribing..." : "Unsubscribe"}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground">
                You can always resubscribe later if you change your mind.
              </p>
            </>
          ) : (
            <>
              <div className="inline-block p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-3xl font-bold">You've Been Unsubscribed</h1>
                <p className="text-muted-foreground">
                  You have successfully unsubscribed from our newsletter. You will no longer receive emails from us.
                </p>
              </div>

              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Return to Home
              </Button>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Unsubscribe;
