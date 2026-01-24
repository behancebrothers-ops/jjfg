import { Button } from "@/components/ui/button";
import { Mail, Link as LinkIcon } from "lucide-react";
import { FacebookIcon, WhatsAppIcon, XIcon } from "@/components/SocialIcons";
import { toast } from "sonner";

interface SocialShareProps {
  productName: string;
  productUrl: string;
}

export const SocialShare = ({ productName, productUrl }: SocialShareProps) => {
  const fullUrl = `${window.location.origin}${productUrl}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(productName);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Share:</span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-[#1877F2]"
          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')}
          title="Share on Facebook"
        >
          <FacebookIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-[#000000] dark:hover:text-white"
          onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, '_blank')}
          title="Share on X"
        >
          <XIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-[#25D366]"
          onClick={() => window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, '_blank')}
          title="Share on WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-primary"
          onClick={() => window.location.href = `mailto:?subject=${encodedTitle}&body=Check out this product: ${fullUrl}`}
          title="Share via Email"
        >
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-primary"
          onClick={copyToClipboard}
          title="Copy Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
