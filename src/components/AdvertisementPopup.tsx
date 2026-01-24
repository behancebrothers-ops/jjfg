import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const AD_POPUP_DELAY = 3000; // 3 seconds

interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  display_frequency: string;
}

export const AdvertisementPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [ad, setAd] = useState<Advertisement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndShowAd = async () => {
      try {
        // Fetch active advertisements
        const { data, error } = await supabase
          .from("advertisements")
          .select("id, title, image_url, link_url, display_frequency")
          .eq("active", true)
          .order("priority", { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) return;

        const advertisement = data[0];
        
        // Check display frequency
        const storageKey = `ad_shown_${advertisement.id}`;
        const lastShown = sessionStorage.getItem(storageKey);
        const lastShownDaily = localStorage.getItem(`${storageKey}_daily`);
        const today = new Date().toDateString();

        if (advertisement.display_frequency === 'once_per_session' && lastShown) {
          return;
        }

        if (advertisement.display_frequency === 'once_per_day' && lastShownDaily === today) {
          return;
        }

        // Schedule popup
        const timer = setTimeout(() => {
          setAd(advertisement);
          setIsOpen(true);
          
          // Mark as shown
          sessionStorage.setItem(storageKey, 'true');
          localStorage.setItem(`${storageKey}_daily`, today);
        }, AD_POPUP_DELAY);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Error fetching advertisement:", error);
      }
    };

    fetchAndShowAd();
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClick = () => {
    if (ad?.link_url) {
      if (ad.link_url.startsWith('http')) {
        window.open(ad.link_url, '_blank');
      } else {
        navigate(ad.link_url);
      }
    }
    handleClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  if (!ad) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-lg p-0 overflow-hidden border-0 shadow-2xl bg-transparent"
      >
        <DialogTitle className="sr-only">{ad.title}</DialogTitle>
        <DialogDescription className="sr-only">Advertisement: {ad.title}</DialogDescription>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative"
        >
          {/* Close button */}
          <DialogClose 
            onClick={handleClose}
            className="absolute right-3 top-3 z-20 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-lg opacity-90 hover:opacity-100 hover:bg-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Advertisement image */}
          <div 
            className="relative cursor-pointer group overflow-hidden rounded-2xl"
            onClick={handleClick}
          >
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-auto max-h-[80vh] object-contain transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Hover overlay */}
            {ad.link_url && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button 
                    size="lg" 
                    className="gap-2 bg-background/90 text-foreground hover:bg-background shadow-xl"
                  >
                    <ExternalLink className="h-5 w-5" />
                    View Now
                  </Button>
                </motion.div>
              </div>
            )}
          </div>

          {/* Title bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-12">
            <h3 className="text-white text-xl font-bold text-center drop-shadow-lg">
              {ad.title}
            </h3>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
