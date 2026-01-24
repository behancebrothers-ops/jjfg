import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { SEOHead, generateLocalBusinessSchema } from "@/components/SEOHead";

const contactFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(50, { message: "First name must be less than 50 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "First name can only contain letters, spaces, hyphens, and apostrophes" }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(50, { message: "Last name must be less than 50 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Last name can only contain letters, spaces, hyphens, and apostrophes" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Phone number must be less than 20 characters" })
    .regex(/^[0-9\s()+.-]*$/, { message: "Invalid phone number format" })
    .optional()
    .or(z.literal("")),
  subject: z
    .string()
    .min(1, { message: "Please select a subject" })
    .max(100, { message: "Subject must be less than 100 characters" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters" })
    .max(2000, { message: "Message must be less than 2000 characters" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      content: "support@cozy.pk",
      description: "We'll reply within 24 hours",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Phone,
      title: "Phone",
      content: "+92 300 1234567",
      description: "Mon-Fri, 9am-6pm PKT",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: MapPin,
      title: "Address",
      content: "Gulberg III, Lahore, Pakistan",
      description: "Visit our flagship store",
      gradient: "from-amber-600 to-yellow-600",
    },
    {
      icon: Clock,
      title: "Store Hours",
      content: "Mon-Sat: 11am-9pm",
      description: "Sun: 12pm-8pm",
      gradient: "from-pink-600 to-purple-600",
    },
  ];

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      const fullName = `${values.firstName} ${values.lastName}`.trim();
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: fullName,
          email: values.email,
          phone: values.phone || "Not provided",
          subject: values.subject,
          message: values.message,
        },
      });
      if (error) throw error;

      toast.success("Message sent! We've emailed you a confirmation.");
      form.reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50">
      <SEOHead
        title="Contact Us | LUXE Premium Fashion"
        description="Get in touch with LUXE customer support. Contact us for orders, shipping, returns, or any questions. Email: support@cozy.pk | Phone: +92 300 1234567"
        keywords="contact luxe, customer support, fashion store contact, help, customer service"
        canonicalUrl="/contact"
        structuredData={generateLocalBusinessSchema()}
      />
      <Navigation />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-20"
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-600 to-pink-600 bg-clip-text text-transparent mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </motion.section>

      {/* Contact Info & Form */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-8">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-bold text-gray-800"
            >
              Contact Information
            </motion.h2>

            <div className="space-y-6">
              {contactInfo.map((info, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="bg-white/80 backdrop-blur-xl border border-amber-100 shadow-xl p-6">
                    <div className="flex items-start gap-5">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${info.gradient} shadow-lg`}>
                        <info.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{info.title}</h3>
                        <p className="font-semibold text-gray-700 mt-1">{info.content}</p>
                        <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/70 backdrop-blur-md border border-amber-200 rounded-2xl p-6 shadow-lg"
            >
              <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Customer Service Hours
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Monday - Friday: 9:00 AM - 6:00 PM PKT</p>
                <p>Saturday: 10:00 AM - 4:00 PM PKT</p>
                <p>Sunday: Closed</p>
              </div>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-8"
          >
            <Card className="bg-white/80 backdrop-blur-xl border border-amber-100 shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Send us a Message</h2>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Umer"
                              className="input-cozy"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Khan"
                              className="input-cozy"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="umer@cozy.pk"
                            className="input-cozy"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+923001234567"
                            className="input-cozy"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="select-cozy">
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Order Inquiry">Order Inquiry</SelectItem>
                                <SelectItem value="Product Question">Product Question</SelectItem>
                                <SelectItem value="Shipping & Delivery">Shipping & Delivery</SelectItem>
                                <SelectItem value="Returns & Exchanges">Returns & Exchanges</SelectItem>
                                <SelectItem value="Technical Support">Technical Support</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us how we can help..."
                            className="input-cozy min-h-[160px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-bold h-14 rounded-xl shadow-lg flex items-center justify-center gap-3"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ Link */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="bg-gradient-to-t from-amber-50 to-transparent py-20"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 mb-8">
              Find quick answers to common questions about orders, shipping, returns, and more.
            </p>
            <motion.a
              href="/faq"
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white/80 backdrop-blur-md border border-amber-200 shadow-lg font-bold text-amber-700 hover:bg-amber-50 transition-all"
            >
              View FAQ
            </motion.a>
          </div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
};

export default Contact;
