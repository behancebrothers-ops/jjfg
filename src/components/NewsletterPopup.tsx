import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowRight, CheckCircle2, Sparkles, Coffee, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Check if user has already subscribed or dismissed
    const hasSeenPopup = localStorage.getItem("newsletter-popup-seen");
    if (!hasSeenPopup) {
      const timer = setTimeout(() => setIsOpen(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("newsletter-popup-seen", "true");
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSuccess(true);
      setIsSubmitting(false);
      localStorage.setItem("newsletter-popup-seen", "true");
      toast.success("Welcome to the LUXEES family!");
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[480px] p-0 border-none bg-transparent shadow-none sm:rounded-[2.5rem] overflow-visible">
        <DialogTitle className="sr-only">Join LUXEES Newsletter</DialogTitle>
        <DialogDescription className="sr-only">Get a exclusive 15% discount on your next order.</DialogDescription>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative overflow-hidden glass-card rounded-[2rem] p-8 md:p-10 border border-border shadow-soft"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-[80px]"
            />
            <motion.div
              animate={{
                x: [0, 30, 0],
                y: [0, -30, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/10 rounded-full blur-[60px]"
            />
          </div>

          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-20 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-8 relative">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm flex items-center justify-center border border-border group"
                    >
                      <Coffee className="w-10 h-10 text-primary transition-transform group-hover:scale-110 duration-300" />
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-2 -right-2"
                    >
                      <Sparkles className="w-6 h-6 text-accent" />
                    </motion.div>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                    Join the <span className="text-primary italic">LUXEES</span> Club
                  </h2>
                  <p className="text-muted-foreground mb-10 leading-relaxed max-w-[320px]">
                    Step into our world of elegance. Subscribe for <span className="text-primary font-bold">15% OFF</span> your first order and exclusive access.
                  </p>

                  <form onSubmit={handleSubscribe} className="w-full space-y-4">
                    <div className="relative group">
                      <Input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-16 bg-white/40 border-border rounded-2xl pl-14 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 transition-all text-lg"
                        required
                      />
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-16 gradient-primary hover:opacity-90 text-white rounded-2xl font-bold text-lg shadow-glow hover:shadow-lg transition-all active:scale-[0.98] group"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Get My Discount <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </form>

                  <button
                    onClick={handleClose}
                    className="mt-8 text-sm text-muted-foreground/80 hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    No thanks, I prefer full price
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-8"
                  >
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-foreground mb-3">You're in!</h3>
                  <p className="text-muted-foreground mb-10 text-lg">
                    Check your inbox. Your welcome code is on its way in a golden envelope.
                  </p>
                  <Button
                    onClick={handleClose}
                    className="w-full h-14 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-2xl font-semibold text-lg"
                  >
                    Start Shopping
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
