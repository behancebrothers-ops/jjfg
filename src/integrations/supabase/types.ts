export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abandoned_cart_emails: {
        Row: {
          cart_items_snapshot: Json
          created_at: string
          email_sent_at: string
          id: string
          user_id: string
        }
        Insert: {
          cart_items_snapshot: Json
          created_at?: string
          email_sent_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cart_items_snapshot?: Json
          created_at?: string
          email_sent_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_frequency: string | null
          end_date: string | null
          id: string
          image_url: string
          link_url: string | null
          priority: number | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_frequency?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          priority?: number | null
          start_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_frequency?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          priority?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          country: string
          created_at: string | null
          full_name: string
          id: string
          is_default: boolean | null
          phone: string | null
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string | null
          city: string
          country: string
          created_at?: string | null
          full_name: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code: string
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string | null
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discount_code_products: {
        Row: {
          created_at: string | null
          discount_code_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          discount_code_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          discount_code_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_products_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          active: boolean | null
          applies_to: string | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          minimum_purchase: number | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          applies_to?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          minimum_purchase?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          applies_to?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          minimum_purchase?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gift_card_transactions: {
        Row: {
          amount: number
          created_at: string | null
          gift_card_id: string
          id: string
          order_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          gift_card_id: string
          id?: string
          order_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          gift_card_id?: string
          id?: string
          order_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_balance: number
          expires_at: string | null
          id: string
          initial_balance: number
          recipient_email: string | null
          sender_user_id: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_balance: number
          expires_at?: string | null
          id?: string
          initial_balance: number
          recipient_email?: string | null
          sender_user_id?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_balance?: number
          expires_at?: string | null
          id?: string
          initial_balance?: number
          recipient_email?: string | null
          sender_user_id?: string | null
        }
        Relationships: []
      }
      inventory_adjustments: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity_change: number
          reason: string
          variant_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity_change: number
          reason: string
          variant_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity_change?: number
          reason?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          job_posting_id: string
          phone: string | null
          resume_path: string
          status: string
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          job_posting_id: string
          phone?: string | null
          resume_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_posting_id?: string
          phone?: string | null
          resume_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          active: boolean
          created_at: string
          department: string
          description: string
          id: string
          location: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department: string
          description: string
          id?: string
          location: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string
          description?: string
          id?: string
          location?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_type: string
          attempts: number
          blocked_until: string | null
          created_at: string
          fingerprint: string | null
          id: string
          identifier: string
          last_attempt_at: string
        }
        Insert: {
          attempt_type?: string
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          identifier: string
          last_attempt_at?: string
        }
        Update: {
          attempt_type?: string
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          identifier?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          subscribed: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          subscribed?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          subscribed?: boolean | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          marketing_emails: boolean
          order_confirmation: boolean
          order_delivered: boolean
          order_shipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_emails?: boolean
          order_confirmation?: boolean
          order_delivered?: boolean
          order_shipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketing_emails?: boolean
          order_confirmation?: boolean
          order_delivered?: boolean
          order_shipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity: number
          size?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivered_at: string | null
          discount_amount: number | null
          discount_code_id: string | null
          id: string
          notes: string | null
          order_number: string
          shipped_at: string | null
          shipping_address_line1: string
          shipping_address_line2: string | null
          shipping_city: string
          shipping_cost: number | null
          shipping_country: string
          shipping_method_id: string | null
          shipping_postal_code: string
          shipping_state: string
          status: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          shipped_at?: string | null
          shipping_address_line1: string
          shipping_address_line2?: string | null
          shipping_city: string
          shipping_cost?: number | null
          shipping_country: string
          shipping_method_id?: string | null
          shipping_postal_code: string
          shipping_state: string
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          shipped_at?: string | null
          shipping_address_line1?: string
          shipping_address_line2?: string | null
          shipping_city?: string
          shipping_cost?: number | null
          shipping_country?: string
          shipping_method_id?: string | null
          shipping_postal_code?: string
          shipping_state?: string
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          fingerprint: string | null
          first_request_at: string
          id: string
          identifier: string
          last_request_at: string
          otp_type: string
          request_count: number
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          fingerprint?: string | null
          first_request_at?: string
          id?: string
          identifier: string
          last_request_at?: string
          otp_type: string
          request_count?: number
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          fingerprint?: string | null
          first_request_at?: string
          id?: string
          identifier?: string
          last_request_at?: string
          otp_type?: string
          request_count?: number
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          position: number | null
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          position?: number | null
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          price_adjustment: number | null
          product_id: string
          size: string | null
          stock: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          price_adjustment?: number | null
          product_id: string
          size?: string | null
          stock?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          price_adjustment?: number | null
          product_id?: string
          size?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_new_arrival: boolean | null
          name: string
          price: number
          sale_ends_at: string | null
          sale_price: number | null
          stock: number
          stripe_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_new_arrival?: boolean | null
          name: string
          price: number
          sale_ends_at?: string | null
          sale_price?: number | null
          stock?: number
          stripe_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_new_arrival?: boolean | null
          name?: string
          price?: number
          sale_ends_at?: string | null
          sale_price?: number | null
          stock?: number
          stripe_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          created_at: string | null
          id: string
          order_item_id: string
          quantity: number
          return_request_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_item_id: string
          quantity: number
          return_request_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_item_id?: string
          quantity?: number
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          order_id: string
          reason: string
          refund_amount: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          reason: string
          refund_amount?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          reason?: string
          refund_amount?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          product_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_banners: {
        Row: {
          active: boolean | null
          badge: string | null
          bg_gradient: string | null
          created_at: string | null
          cta_link: string | null
          cta_text: string | null
          icon_type: string | null
          id: string
          position: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          bg_gradient?: string | null
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          icon_type?: string | null
          id?: string
          position?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          bg_gradient?: string | null
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          icon_type?: string | null
          id?: string
          position?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_settings: {
        Row: {
          created_at: string | null
          id: string
          sale_active: boolean | null
          sale_navbar_visible: boolean | null
          sale_subtitle: string | null
          sale_title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          sale_active?: boolean | null
          sale_navbar_visible?: boolean | null
          sale_subtitle?: string | null
          sale_title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          sale_active?: boolean | null
          sale_navbar_visible?: boolean | null
          sale_subtitle?: string | null
          sale_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          shipping_method_id: string | null
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          shipping_method_id?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          shipping_method_id?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          active: boolean | null
          base_cost: number
          created_at: string | null
          description: string | null
          estimated_days_max: number | null
          estimated_days_min: number | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          base_cost: number
          created_at?: string | null
          description?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          base_cost?: number
          created_at?: string | null
          description?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          active: boolean | null
          country: string
          created_at: string | null
          id: string
          name: string
          rate: number
          state: string | null
        }
        Insert: {
          active?: boolean | null
          country: string
          created_at?: string | null
          id?: string
          name: string
          rate: number
          state?: string | null
        }
        Update: {
          active?: boolean | null
          country?: string
          created_at?: string | null
          id?: string
          name?: string
          rate?: number
          state?: string | null
        }
        Relationships: []
      }
      user_2fa_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_discount_code: {
        Args: { p_code: string; p_order_amount: number }
        Returns: {
          discount_amount: number
          discount_id: string
          discount_type: string
          discount_value: number
          error_message: string
        }[]
      }
      check_login_rate_limit: {
        Args: {
          p_identifier: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: {
          blocked_until: string
          is_blocked: boolean
          remaining_attempts: number
        }[]
      }
      check_otp_rate_limit: {
        Args: {
          p_identifier: string
          p_lockout_minutes?: number
          p_max_requests?: number
          p_otp_type: string
          p_window_minutes?: number
        }
        Returns: {
          blocked_until: string
          is_blocked: boolean
          remaining_requests: number
        }[]
      }
      cleanup_expired_2fa_codes: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      cleanup_old_otp_rate_limits: { Args: never; Returns: undefined }
      clear_login_attempts: {
        Args: { p_identifier: string }
        Returns: undefined
      }
      get_user_id: { Args: never; Returns: string }
      has_purchased_product: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner:
        | {
            Args: { check_user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_owner(check_user_id => text), public.is_owner(check_user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { check_user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_owner(check_user_id => text), public.is_owner(check_user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      record_failed_login: {
        Args: {
          p_fingerprint?: string
          p_identifier: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: {
          blocked_until: string
          is_blocked: boolean
          remaining_attempts: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
