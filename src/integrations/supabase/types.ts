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
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          lead_id: string | null
          organization_id: string
          reminder_minutes: number | null
          reminder_sent: boolean | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          organization_id: string
          reminder_minutes?: number | null
          reminder_sent?: boolean | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          organization_id?: string
          reminder_minutes?: number | null
          reminder_sent?: boolean | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          name: string
          phone: string | null
          postal_code: string
          type: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          name: string
          phone?: string | null
          postal_code: string
          type?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accepts_marketing: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_purchase: number | null
          organization_id: string
          starts_at: string | null
          type: string
          uses_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          organization_id: string
          starts_at?: string | null
          type: string
          uses_count?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          organization_id?: string
          starts_at?: string | null
          type?: string
          uses_count?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          ai_qualification_rules: string | null
          created_at: string | null
          form_settings: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          meta_pixels: Json | null
          msg_template_cold: string | null
          msg_template_hot: string | null
          msg_template_warm: string | null
          name: string
          organization_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          ai_qualification_rules?: string | null
          created_at?: string | null
          form_settings?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          meta_pixels?: Json | null
          msg_template_cold?: string | null
          msg_template_hot?: string | null
          msg_template_warm?: string | null
          name: string
          organization_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          ai_qualification_rules?: string | null
          created_at?: string | null
          form_settings?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          meta_pixels?: Json | null
          msg_template_cold?: string | null
          msg_template_hot?: string | null
          msg_template_warm?: string | null
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          product_id: string | null
          quantity: number
          reference_id: string | null
          type: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          type: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          automation_enabled: boolean
          created_at: string | null
          custom_data: Json | null
          email: string
          form_id: string | null
          gdpr_consent: boolean
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string
          source: string | null
          status: string | null
          temperature: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          automation_enabled?: boolean
          created_at?: string | null
          custom_data?: Json | null
          email: string
          form_id?: string | null
          gdpr_consent?: boolean
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone: string
          source?: string | null
          status?: string | null
          temperature?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          automation_enabled?: boolean
          created_at?: string | null
          custom_data?: Json | null
          email?: string
          form_id?: string | null
          gdpr_consent?: boolean
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          source?: string | null
          status?: string | null
          temperature?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          total: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
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
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          customer_id: string | null
          discount_code: string | null
          discount_total: number | null
          fulfillment_status: string | null
          id: string
          internal_notes: string | null
          lead_id: string | null
          notes: string | null
          order_number: string
          organization_id: string
          payment_status: string | null
          shipping_address: Json | null
          shipping_total: number | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_total: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          customer_id?: string | null
          discount_code?: string | null
          discount_total?: number | null
          fulfillment_status?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          notes?: string | null
          order_number: string
          organization_id: string
          payment_status?: string | null
          shipping_address?: Json | null
          shipping_total?: number | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_total?: number | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          customer_id?: string | null
          discount_code?: string | null
          discount_total?: number | null
          fulfillment_status?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string
          payment_status?: string | null
          shipping_address?: Json | null
          shipping_total?: number | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_total?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_qualification_rules: string | null
          created_at: string | null
          enabled_modules: Json | null
          form_settings: Json | null
          id: string
          meta_pixels: Json | null
          msg_template_cold: string | null
          msg_template_hot: string | null
          msg_template_warm: string | null
          name: string
          niche: string | null
          plan: string | null
          public_key: string
          slug: string
          webhook_url: string | null
          whatsapp_api_key: string | null
          whatsapp_base_url: string | null
          whatsapp_instance: string | null
        }
        Insert: {
          ai_qualification_rules?: string | null
          created_at?: string | null
          enabled_modules?: Json | null
          form_settings?: Json | null
          id?: string
          meta_pixels?: Json | null
          msg_template_cold?: string | null
          msg_template_hot?: string | null
          msg_template_warm?: string | null
          name: string
          niche?: string | null
          plan?: string | null
          public_key?: string
          slug: string
          webhook_url?: string | null
          whatsapp_api_key?: string | null
          whatsapp_base_url?: string | null
          whatsapp_instance?: string | null
        }
        Update: {
          ai_qualification_rules?: string | null
          created_at?: string | null
          enabled_modules?: Json | null
          form_settings?: Json | null
          id?: string
          meta_pixels?: Json | null
          msg_template_cold?: string | null
          msg_template_hot?: string | null
          msg_template_warm?: string | null
          name?: string
          niche?: string | null
          plan?: string | null
          public_key?: string
          slug?: string
          webhook_url?: string | null
          whatsapp_api_key?: string | null
          whatsapp_base_url?: string | null
          whatsapp_instance?: string | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_final_negative: boolean | null
          is_final_positive: boolean | null
          key: string
          name: string
          organization_id: string
          position: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_final_negative?: boolean | null
          is_final_positive?: boolean | null
          key: string
          name: string
          organization_id: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_final_negative?: boolean | null
          is_final_positive?: boolean | null
          key?: string
          name?: string
          organization_id?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          organization_id: string
          parent_id: string | null
          position: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          organization_id: string
          parent_id?: string | null
          position?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          position?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          position: number | null
          product_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          position?: number | null
          product_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          position?: number | null
          product_id?: string
          url?: string
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
          compare_at_price: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          options: Json | null
          price: number
          product_id: string
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          options?: Json | null
          price: number
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          options?: Json | null
          price?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          weight_grams?: number | null
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
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_digital: boolean | null
          is_ecommerce: boolean | null
          low_stock_threshold: number | null
          name: string
          organization_id: string
          price: number | null
          requires_shipping: boolean | null
          short_description: string | null
          sku: string | null
          slug: string | null
          stock_quantity: number | null
          tags: string[] | null
          track_inventory: boolean | null
          updated_at: string | null
          weight_grams: number | null
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_digital?: boolean | null
          is_ecommerce?: boolean | null
          low_stock_threshold?: number | null
          name: string
          organization_id: string
          price?: number | null
          requires_shipping?: boolean | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          track_inventory?: boolean | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_digital?: boolean | null
          is_ecommerce?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          organization_id?: string
          price?: number | null
          requires_shipping?: boolean | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          track_inventory?: boolean | null
          updated_at?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          organization_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          organization_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_products: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          proposal_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          proposal_id: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          proposal_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_products_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          organization_id: string
          proposal_date: string | null
          status: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          organization_id: string
          proposal_date?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          organization_id?: string
          proposal_date?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          organization_id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          organization_id: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          organization_id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string | null
          notes: string | null
          organization_id: string
          proposal_id: string | null
          status: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id: string
          proposal_id?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          proposal_id?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          order_id: string
          organization_id: string
          shipped_at: string | null
          status: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          organization_id: string
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          organization_id?: string
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
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
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      accept_invite: {
        Args: { _token: string; _user_id: string }
        Returns: boolean
      }
      create_organization_for_current_user: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      generate_order_number: { Args: { _org_id: string }; Returns: string }
      get_form_by_slugs: {
        Args: { _form_slug?: string; _org_slug: string }
        Returns: {
          form_id: string
          form_name: string
          form_settings: Json
          meta_pixels: Json
          org_id: string
          org_name: string
          org_slug: string
          public_key: string
        }[]
      }
      get_org_by_public_key: { Args: { _public_key: string }; Returns: string }
      get_org_name_by_invite_token: {
        Args: { _token: string }
        Returns: string
      }
      get_public_form_by_key: {
        Args: { _public_key: string }
        Returns: {
          form_settings: Json
          id: string
          name: string
        }[]
      }
      get_public_form_by_slug: {
        Args: { _slug: string }
        Returns: {
          form_settings: Json
          id: string
          meta_pixels: Json
          name: string
          public_key: string
        }[]
      }
      get_slug_by_public_key: { Args: { _public_key: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_slug_available: { Args: { _slug: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "viewer" | "salesperson"
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
      app_role: ["super_admin", "admin", "viewer", "salesperson"],
    },
  },
} as const
