import { useEffect } from "react";
import { generateOrganizationSchema } from "@/lib/structuredData";

/**
 * Component that injects organization structured data into the page head
 * Should be included once in the root layout/page
 */
export const OrganizationSchema = () => {
  useEffect(() => {
    // Create script element
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(generateOrganizationSchema());
    script.id = "organization-schema";
    
    // Append to head
    document.head.appendChild(script);
    
    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById("organization-schema");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
  
  return null;
};
