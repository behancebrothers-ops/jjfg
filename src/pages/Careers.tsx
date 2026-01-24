import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Briefcase, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { useState } from "react";
import { SEOHead, generateWebPageSchema } from "@/components/SEOHead";

const Careers = () => {
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string } | null>(null);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);

  const { data: openings = [], isLoading } = useQuery({
    queryKey: ["job-postings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_postings")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleApplyClick = (job: { id: string; title: string }) => {
    setSelectedJob(job);
    setIsApplicationDialogOpen(true);
  };

  const benefits = [
    "Competitive salary and performance bonuses",
    "Comprehensive health, dental, and vision insurance",
    "401(k) with company match",
    "Generous employee discount",
    "Professional development opportunities",
    "Flexible work arrangements",
    "Paid time off and holidays",
    "Collaborative and creative work environment"
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Careers at LUXE | Join Our Fashion Team"
        description="Join the LUXE team! Explore exciting career opportunities in fashion retail, design, and more. Competitive benefits and growth opportunities."
        keywords="fashion jobs, retail careers, luxe careers, fashion industry jobs"
        canonicalUrl="/careers"
        structuredData={generateWebPageSchema({
          name: "Careers at LUXE",
          description: "Join our team and be part of redefining modern fashion.",
          url: "https://luxurious-store.vercel.app/careers",
        })}
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl mb-6">Join Our Team</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Be part of a passionate team shaping the future of luxury fashion.
          </p>
        </div>
      </section>

      {/* Why LUXE Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Why Work at LUXE?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            At LUXE, we believe in nurturing talent, fostering creativity, and building a culture 
            where everyone can thrive. Join us in creating exceptional fashion experiences and 
            making a positive impact in the industry.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-20">
          {benefits.map((benefit, idx) => (
            <Card key={idx} className="p-6 flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <p className="text-muted-foreground">{benefit}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Open Positions</h2>
            <p className="text-lg text-muted-foreground">
              {isLoading ? "Loading..." : `${openings.length} opportunities available`}
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="p-6">
                  <Skeleton className="h-6 w-64 mb-4" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </Card>
              ))
            ) : openings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">
                  No open positions at the moment. Check back soon!
                </p>
              </Card>
            ) : (
              openings.map((job) => (
              <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                    <p className="text-muted-foreground mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="group"
                    onClick={() => handleApplyClick({ id: job.id, title: job.title })}
                  >
                    Apply Now
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Don't see the right role?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We're always looking for talented individuals. Send us your resume and we'll keep 
            you in mind for future opportunities.
          </p>
          <Button size="lg" className="gradient-primary btn-glow">Send Your Resume</Button>
        </div>
      </section>

      <Footer />

      {selectedJob && (
        <JobApplicationDialog
          open={isApplicationDialogOpen}
          onOpenChange={setIsApplicationDialogOpen}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
        />
      )}
    </div>
  );
};

export default Careers;
