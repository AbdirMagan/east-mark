// Generated from the East-Market Supabase schema. Do not edit by hand.
//
// Regenerate after every migration:
//   npx supabase gen types typescript --project-id ikfozizfgiemwuokoczf > src/types/database.ts
//
/* eslint-disable */

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          payload: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          payload?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          payload?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          badge: string | null
          cta_label: string | null
          icon: string | null
          theme: string
          advertiser_id: string | null
          business_id: string | null
          category_ids: number[]
          city_ids: number[]
          clicks: number
          country_ids: number[]
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          impressions: number
          language_codes: string[]
          payment_id: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          priority: number
          starts_at: string
          status: Database["public"]["Enums"]["ad_status"]
          subtitle: string | null
          target_type: string
          target_value: string | null
          title: string
          translations: Json
          updated_at: string
        }
        Insert: {
          badge?: string | null
          cta_label?: string | null
          icon?: string | null
          theme?: string
          advertiser_id?: string | null
          business_id?: string | null
          category_ids?: number[]
          city_ids?: number[]
          clicks?: number
          country_ids?: number[]
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          language_codes?: string[]
          payment_id?: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          subtitle?: string | null
          target_type?: string
          target_value?: string | null
          title: string
          translations?: Json
          updated_at?: string
        }
        Update: {
          badge?: string | null
          cta_label?: string | null
          icon?: string | null
          theme?: string
          advertiser_id?: string | null
          business_id?: string | null
          category_ids?: number[]
          city_ids?: number[]
          clicks?: number
          country_ids?: number[]
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          language_codes?: string[]
          payment_id?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          subtitle?: string | null
          target_type?: string
          target_value?: string | null
          title?: string
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_employees: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          job_title: string | null
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          job_title?: string | null
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          job_title?: string | null
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          categories: number[]
          city_id: number | null
          country_id: number | null
          cover_url: string | null
          created_at: string
          description: string | null
          district_id: number | null
          email: string | null
          follower_count: number
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json
          owner_id: string
          phone: string | null
          product_count: number
          rating_avg: number
          rating_count: number
          region_id: number | null
          registration_number: string | null
          seller_profile_id: string | null
          slug: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          categories?: number[]
          city_id?: number | null
          country_id?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          district_id?: number | null
          email?: string | null
          follower_count?: number
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json
          owner_id: string
          phone?: string | null
          product_count?: number
          rating_avg?: number
          rating_count?: number
          region_id?: number | null
          registration_number?: string | null
          seller_profile_id?: string | null
          slug: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          categories?: number[]
          city_id?: number | null
          country_id?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          district_id?: number | null
          email?: string | null
          follower_count?: number
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json
          owner_id?: string
          phone?: string | null
          product_count?: number
          rating_avg?: number
          rating_count?: number
          region_id?: number | null
          registration_number?: string | null
          seller_profile_id?: string | null
          slug?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          accent_color: string | null
          created_at: string
          field_schema: Json
          icon: string | null
          id: number
          image_url: string | null
          is_active: boolean
          parent_id: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          field_schema?: Json
          icon?: string | null
          id?: never
          image_url?: string | null
          is_active?: boolean
          parent_id?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          field_schema?: Json
          icon?: string | null
          id?: never
          image_url?: string | null
          is_active?: boolean
          parent_id?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: number
          description: string | null
          language_code: string
          name: string
        }
        Insert: {
          category_id: number
          description?: string | null
          language_code: string
          name: string
        }
        Update: {
          category_id?: number
          description?: string | null
          language_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: number
          created_at: string
          id: number
          is_active: boolean
          is_major: boolean
          latitude: number | null
          longitude: number | null
          name: string
          region_id: number
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          country_id: number
          created_at?: string
          id?: never
          is_active?: boolean
          is_major?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          region_id: number
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          country_id?: number
          created_at?: string
          id?: never
          is_active?: boolean
          is_major?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          region_id?: number
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string | null
          buyer_archived: boolean
          buyer_deleted_at: string | null
          buyer_id: string
          buyer_unread_count: number
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          last_sender_id: string | null
          product_id: string | null
          seller_archived: boolean
          seller_deleted_at: string | null
          seller_id: string
          seller_unread_count: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          buyer_archived?: boolean
          buyer_deleted_at?: string | null
          buyer_id: string
          buyer_unread_count?: number
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_sender_id?: string | null
          product_id?: string | null
          seller_archived?: boolean
          seller_deleted_at?: string | null
          seller_id: string
          seller_unread_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          buyer_archived?: boolean
          buyer_deleted_at?: string | null
          buyer_id?: string
          buyer_unread_count?: number
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_sender_id?: string | null
          product_id?: string | null
          seller_archived?: boolean
          seller_deleted_at?: string | null
          seller_id?: string
          seller_unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_last_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          code3: string | null
          created_at: string
          default_currency_code: string | null
          default_language_code: string | null
          dial_code: string
          flag_emoji: string | null
          id: number
          is_active: boolean
          name: string
          phone_number_length: number | null
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          code: string
          code3?: string | null
          created_at?: string
          default_currency_code?: string | null
          default_language_code?: string | null
          dial_code: string
          flag_emoji?: string | null
          id?: never
          is_active?: boolean
          name: string
          phone_number_length?: number | null
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          code3?: string | null
          created_at?: string
          default_currency_code?: string | null
          default_language_code?: string | null
          dial_code?: string
          flag_emoji?: string | null
          id?: never
          is_active?: boolean
          name?: string
          phone_number_length?: number | null
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_default_currency_code_fkey"
            columns: ["default_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "countries_default_language_code_fkey"
            columns: ["default_language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_digits: number
          is_active: boolean
          name: string
          sort_order: number
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_digits?: number
          is_active?: boolean
          name: string
          sort_order?: number
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_digits?: number
          is_active?: boolean
          name?: string
          sort_order?: number
          symbol?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          device_name: string | null
          id: string
          is_active: boolean
          last_used_at: string
          locale: string | null
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string
          locale?: string | null
          platform: string
          token: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string
          locale?: string | null
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          city_id: number
          created_at: string
          id: number
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          city_id: number
          created_at?: string
          id?: never
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          city_id?: number
          created_at?: string
          id?: never
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_code: string
          fetched_at: string
          quote_code: string
          rate: number
          source: string
        }
        Insert: {
          base_code: string
          fetched_at?: string
          quote_code: string
          rate: number
          source?: string
        }
        Update: {
          base_code?: string
          fetched_at?: string
          quote_code?: string
          rate?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_code_fkey"
            columns: ["base_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_code_fkey"
            columns: ["quote_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          price_at_save: number | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          price_at_save?: number | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          price_at_save?: number | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          clicks: number
          created_at: string
          currency_code: string
          duration_days: number
          ends_at: string
          id: string
          impressions: number
          is_active: boolean
          payment_id: string | null
          price: number
          product_id: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          currency_code?: string
          duration_days: number
          ends_at: string
          id?: string
          impressions?: number
          is_active?: boolean
          payment_id?: string | null
          price?: number
          product_id: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          currency_code?: string
          duration_days?: number
          ends_at?: string
          id?: string
          impressions?: number
          is_active?: boolean
          payment_id?: string | null
          price?: number
          product_id?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "featured_listings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          is_rtl: boolean
          name: string
          native_name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          is_rtl?: boolean
          name: string
          native_name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          is_rtl?: boolean
          name?: string
          native_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_bytes: number | null
          attachment_mime: string | null
          attachment_path: string | null
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          duration_seconds: number | null
          edited_at: string | null
          id: string
          metadata: Json
          product_id: string | null
          read_at: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          attachment_bytes?: number | null
          attachment_mime?: string | null
          attachment_path?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          duration_seconds?: number | null
          edited_at?: string | null
          id?: string
          metadata?: Json
          product_id?: string | null
          read_at?: string | null
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          attachment_bytes?: number | null
          attachment_mime?: string | null
          attachment_path?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          duration_seconds?: number | null
          edited_at?: string | null
          id?: string
          metadata?: Json
          product_id?: string | null
          read_at?: string | null
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          created_at: string
          district_id: number
          id: number
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: number
          id?: never
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: number
          id?: never
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          type_overrides: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          type_overrides?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          type_overrides?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          image_url: string | null
          pushed_at: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          pushed_at?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          pushed_at?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          code: string
          config: Json
          country_codes: string[]
          created_at: string
          currency_codes: string[]
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          country_codes?: string[]
          created_at?: string
          currency_codes?: string[]
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          country_codes?: string[]
          created_at?: string
          currency_codes?: string[]
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          error_code: string | null
          error_message: string | null
          id: string
          payment_id: string
          provider_code: string
          provider_reference: string | null
          request: Json
          response: Json
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          payment_id: string
          provider_code: string
          provider_reference?: string | null
          request?: Json
          response?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          payment_id?: string
          provider_code?: string
          provider_reference?: string | null
          request?: Json
          response?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payment_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string | null
          created_at: string
          currency_code: string
          failure_reason: string | null
          id: string
          metadata: Json
          paid_at: string | null
          provider_code: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
          subject_id: string | null
          subject_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          created_at?: string
          currency_code: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider_code?: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          reference: string
          status?: Database["public"]["Enums"]["payment_status"]
          subject_id?: string | null
          subject_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          created_at?: string
          currency_code?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider_code?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          subject_id?: string | null
          subject_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          bytes: number | null
          created_at: string
          height: number | null
          id: string
          is_primary: boolean
          position: number
          product_id: string
          storage_path: string
          thumbnail_url: string | null
          url: string
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id: string
          storage_path: string
          thumbnail_url?: string | null
          url: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id?: string
          storage_path?: string
          thumbnail_url?: string | null
          url?: string
          width?: number | null
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
      product_views: {
        Row: {
          created_at: string
          id: number
          product_id: string
          session_id: string | null
          source: string | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          product_id: string
          session_id?: string | null
          source?: string | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          product_id?: string
          session_id?: string | null
          source?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          brand: string | null
          business_id: string | null
          category_id: number
          city_id: number | null
          color: string | null
          condition: Database["public"]["Enums"]["product_condition"]
          country_id: number
          created_at: string
          currency_code: string
          delivery_available: boolean
          description: string | null
          district_id: number | null
          expires_at: string | null
          favorite_count: number
          featured_until: string | null
          id: string
          is_featured: boolean
          is_negotiable: boolean
          latitude: number | null
          longitude: number | null
          message_count: number
          model: string | null
          neighborhood_id: number | null
          phone: string | null
          price: number
          published_at: string | null
          quantity: number
          ref: number
          region_id: number | null
          rejection_reason: string | null
          search_vector: unknown
          seller_id: string
          size: string | null
          slug: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["product_status"]
          subcategory_id: number | null
          title: string
          updated_at: string
          view_count: number
          whatsapp: string | null
          year: number | null
        }
        Insert: {
          attributes?: Json
          brand?: string | null
          business_id?: string | null
          category_id: number
          city_id?: number | null
          color?: string | null
          condition?: Database["public"]["Enums"]["product_condition"]
          country_id: number
          created_at?: string
          currency_code: string
          delivery_available?: boolean
          description?: string | null
          district_id?: number | null
          expires_at?: string | null
          favorite_count?: number
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_negotiable?: boolean
          latitude?: number | null
          longitude?: number | null
          message_count?: number
          model?: string | null
          neighborhood_id?: number | null
          phone?: string | null
          price: number
          published_at?: string | null
          quantity?: number
          ref?: never
          region_id?: number | null
          rejection_reason?: string | null
          search_vector?: unknown
          seller_id: string
          size?: string | null
          slug?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          subcategory_id?: number | null
          title: string
          updated_at?: string
          view_count?: number
          whatsapp?: string | null
          year?: number | null
        }
        Update: {
          attributes?: Json
          brand?: string | null
          business_id?: string | null
          category_id?: number
          city_id?: number | null
          color?: string | null
          condition?: Database["public"]["Enums"]["product_condition"]
          country_id?: number
          created_at?: string
          currency_code?: string
          delivery_available?: boolean
          description?: string | null
          district_id?: number | null
          expires_at?: string | null
          favorite_count?: number
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_negotiable?: boolean
          latitude?: number | null
          longitude?: number | null
          message_count?: number
          model?: string | null
          neighborhood_id?: number | null
          phone?: string | null
          price?: number
          published_at?: string | null
          quantity?: number
          ref?: never
          region_id?: number | null
          rejection_reason?: string | null
          search_vector?: unknown
          seller_id?: string
          size?: string | null
          slug?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          subcategory_id?: number | null
          title?: string
          updated_at?: string
          view_count?: number
          whatsapp?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          bio: string | null
          city_id: number | null
          country_id: number | null
          created_at: string
          currency_code: string
          district_id: number | null
          full_name: string | null
          id: string
          interests: number[]
          is_active: boolean
          is_banned: boolean
          language_code: string
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          neighborhood_id: number | null
          onboarded_at: string | null
          region_id: number | null
          role: Database["public"]["Enums"]["user_role"]
          theme: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          city_id?: number | null
          country_id?: number | null
          created_at?: string
          currency_code?: string
          district_id?: number | null
          full_name?: string | null
          id: string
          interests?: number[]
          is_active?: boolean
          is_banned?: boolean
          language_code?: string
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood_id?: number | null
          onboarded_at?: string | null
          region_id?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          city_id?: number | null
          country_id?: number | null
          created_at?: string
          currency_code?: string
          district_id?: number | null
          full_name?: string | null
          id?: string
          interests?: number[]
          is_active?: boolean
          is_banned?: boolean
          language_code?: string
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood_id?: number | null
          onboarded_at?: string | null
          region_id?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          country_id: number
          created_at: string
          id: number
          is_active: boolean
          name: string
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          code?: string | null
          country_id: number
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          code?: string | null
          country_id?: number
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          created_at: string
          details: string | null
          evidence_urls: string[]
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          created_at?: string
          details?: string | null
          evidence_urls?: string[]
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          created_at?: string
          details?: string | null
          evidence_urls?: string[]
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          product_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          seller_replied_at: string | null
          seller_reply: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          product_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          product_id?: string | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_match_at: string | null
          last_notified_at: string | null
          match_count: number
          name: string
          notify: boolean
          query: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_match_at?: string | null
          last_notified_at?: string | null
          match_count?: number
          name: string
          notify?: boolean
          query?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_match_at?: string | null
          last_notified_at?: string | null
          match_count?: number
          name?: string
          notify?: boolean
          query?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          filters: Json
          id: number
          query: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: never
          query: string
          result_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: never
          query?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_follows: {
        Row: {
          created_at: string
          follower_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_follows_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          about: string | null
          active_listing_count: number
          avg_response_minutes: number | null
          created_at: string
          display_name: string | null
          follower_count: number
          id: string
          listing_count: number
          rating_avg: number
          rating_count: number
          response_rate: number | null
          seller_type: Database["public"]["Enums"]["seller_type"]
          sold_count: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          about?: string | null
          active_listing_count?: number
          avg_response_minutes?: number | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          id?: string
          listing_count?: number
          rating_avg?: number
          rating_count?: number
          response_rate?: number | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          sold_count?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          about?: string | null
          active_listing_count?: number
          avg_response_minutes?: number | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          id?: string
          listing_count?: number
          rating_avg?: number
          rating_count?: number
          response_rate?: number | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          sold_count?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          description: string | null
          featured_credits: number
          features: Json
          id: number
          interval_count: number
          interval_unit: string
          is_active: boolean
          max_employees: number
          max_images_per_listing: number
          max_listings: number | null
          name: string
          price: number
          sort_order: number
          tier: number
          translations: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          description?: string | null
          featured_credits?: number
          features?: Json
          id?: never
          interval_count?: number
          interval_unit?: string
          is_active?: boolean
          max_employees?: number
          max_images_per_listing?: number
          max_listings?: number | null
          name: string
          price?: number
          sort_order?: number
          tier?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          featured_credits?: number
          features?: Json
          id?: never
          interval_count?: number
          interval_unit?: string
          is_active?: boolean
          max_employees?: number
          max_images_per_listing?: number
          max_listings?: number | null
          name?: string
          price?: number
          sort_order?: number
          tier?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          business_id: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string
          featured_credits_remaining: number
          id: string
          plan_id: number
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at: string
          featured_credits_remaining?: number
          id?: string
          plan_id: number
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          business_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at?: string
          featured_credits_remaining?: number
          id?: string
          plan_id?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contacts: {
        Row: {
          phone: string | null
          phone_verified: boolean
          show_phone: boolean
          show_whatsapp: boolean
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          phone?: string | null
          phone_verified?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          phone?: string | null
          phone_verified?: boolean
          show_phone?: boolean
          show_whatsapp?: boolean
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          business_id: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          documents: Json
          full_name: string | null
          id: string
          kind: Database["public"]["Enums"]["verification_kind"]
          notes: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          documents?: Json
          full_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind"]
          notes?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          documents?: Json
          full_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind"]
          notes?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      category_descendants: {
        Args: { p_category_id: number }
        Returns: number[]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      em_distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      em_normalize: { Args: { txt: string }; Returns: string }
      em_try_uuid: { Args: { txt: string }; Returns: string }
      get_seller_contact: {
        Args: { p_seller_id: string }
        Returns: {
          phone: string
          whatsapp: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_pair: { Args: { a: string; b: string }; Returns: boolean }
      is_business_member: { Args: { b_id: string }; Returns: boolean }
      is_conversation_member: { Args: { c_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_trusted_context: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      recommended_products: {
        Args: { p_limit?: number; p_offset?: number; p_user_id?: string }
        Returns: {
          attributes: Json
          brand: string | null
          business_id: string | null
          category_id: number
          city_id: number | null
          color: string | null
          condition: Database["public"]["Enums"]["product_condition"]
          country_id: number
          created_at: string
          currency_code: string
          delivery_available: boolean
          description: string | null
          district_id: number | null
          expires_at: string | null
          favorite_count: number
          featured_until: string | null
          id: string
          is_featured: boolean
          is_negotiable: boolean
          latitude: number | null
          longitude: number | null
          message_count: number
          model: string | null
          neighborhood_id: number | null
          phone: string | null
          price: number
          published_at: string | null
          quantity: number
          ref: number
          region_id: number | null
          rejection_reason: string | null
          search_vector: unknown
          seller_id: string
          size: string | null
          slug: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["product_status"]
          subcategory_id: number | null
          title: string
          updated_at: string
          view_count: number
          whatsapp: string | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_ad_click: { Args: { p_ad_id: string }; Returns: undefined }
      record_ad_impression: { Args: { p_ad_id: string }; Returns: undefined }
      record_product_view: {
        Args: { p_product_id: string; p_session_id?: string; p_source?: string }
        Returns: undefined
      }
      search_products: {
        Args: {
          p_business_id?: string
          p_category_id?: number
          p_city_id?: number
          p_conditions?: Database["public"]["Enums"]["product_condition"][]
          p_country_id?: number
          p_currency_code?: string
          p_delivery_only?: boolean
          p_district_id?: number
          p_featured_only?: boolean
          p_include_subcategories?: boolean
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_max_price?: number
          p_min_price?: number
          p_negotiable_only?: boolean
          p_offset?: number
          p_posted_within_days?: number
          p_query?: string
          p_radius_km?: number
          p_region_id?: number
          p_seller_id?: string
          p_seller_type?: Database["public"]["Enums"]["seller_type"]
          p_sort?: string
          p_verified_only?: boolean
        }
        Returns: {
          business_id: string
          business_name: string
          category_id: number
          city_id: number
          city_name: string
          condition: Database["public"]["Enums"]["product_condition"]
          country_code: string
          country_id: number
          currency_code: string
          delivery_available: boolean
          distance_km: number
          favorite_count: number
          id: string
          image_count: number
          image_url: string
          is_featured: boolean
          is_negotiable: boolean
          latitude: number
          longitude: number
          price: number
          published_at: string
          ref: number
          seller_avatar: string
          seller_id: string
          seller_name: string
          seller_verified: boolean
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          thumbnail_url: string
          title: string
          total_count: number
          view_count: number
        }[]
      }
      similar_products: {
        Args: { p_limit?: number; p_product_id: string }
        Returns: {
          attributes: Json
          brand: string | null
          business_id: string | null
          category_id: number
          city_id: number | null
          color: string | null
          condition: Database["public"]["Enums"]["product_condition"]
          country_id: number
          created_at: string
          currency_code: string
          delivery_available: boolean
          description: string | null
          district_id: number | null
          expires_at: string | null
          favorite_count: number
          featured_until: string | null
          id: string
          is_featured: boolean
          is_negotiable: boolean
          latitude: number | null
          longitude: number | null
          message_count: number
          model: string | null
          neighborhood_id: number | null
          phone: string | null
          price: number
          published_at: string | null
          quantity: number
          ref: number
          region_id: number | null
          rejection_reason: string | null
          search_vector: unknown
          seller_id: string
          size: string | null
          slug: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["product_status"]
          subcategory_id: number | null
          title: string
          updated_at: string
          view_count: number
          whatsapp: string | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      start_conversation: {
        Args: { p_product_id: string; p_seller_id?: string }
        Returns: string
      }
    }
    Enums: {
      ad_placement:
        | "home_hero"
        | "home_banner"
        | "search_inline"
        | "category_banner"
        | "product_detail"
        | "sponsored_product"
      ad_status:
        | "draft"
        | "scheduled"
        | "running"
        | "paused"
        | "ended"
        | "rejected"
      message_type: "text" | "image" | "voice" | "system" | "product"
      notification_type:
        | "new_message"
        | "listing_approved"
        | "listing_rejected"
        | "listing_expiring"
        | "product_sold"
        | "price_changed"
        | "saved_search_match"
        | "new_follower"
        | "advertisement"
        | "subscription_expiring"
        | "verification_result"
        | "review_received"
        | "system"
      payment_purpose:
        | "featured_listing"
        | "subscription"
        | "advertisement"
        | "verification"
        | "other"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
        | "cancelled"
      product_condition: "new" | "like_new" | "used" | "refurbished"
      product_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "rejected"
        | "sold"
        | "expired"
        | "suspended"
        | "deleted"
      report_reason:
        | "scam"
        | "fake_product"
        | "wrong_information"
        | "offensive"
        | "illegal"
        | "duplicate"
        | "spam"
        | "other"
      report_status: "open" | "under_review" | "actioned" | "dismissed"
      report_target: "product" | "seller" | "business" | "message" | "review"
      review_status: "pending" | "approved" | "rejected"
      seller_type: "individual" | "business"
      subscription_status:
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
        | "trialing"
      user_role: "buyer" | "seller" | "business" | "moderator" | "admin"
      verification_kind: "identity" | "business" | "phone" | "address"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ad_placement: [
        "home_hero",
        "home_banner",
        "search_inline",
        "category_banner",
        "product_detail",
        "sponsored_product",
      ],
      ad_status: [
        "draft",
        "scheduled",
        "running",
        "paused",
        "ended",
        "rejected",
      ],
      message_type: ["text", "image", "voice", "system", "product"],
      notification_type: [
        "new_message",
        "listing_approved",
        "listing_rejected",
        "listing_expiring",
        "product_sold",
        "price_changed",
        "saved_search_match",
        "new_follower",
        "advertisement",
        "subscription_expiring",
        "verification_result",
        "review_received",
        "system",
      ],
      payment_purpose: [
        "featured_listing",
        "subscription",
        "advertisement",
        "verification",
        "other",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        "cancelled",
      ],
      product_condition: ["new", "like_new", "used", "refurbished"],
      product_status: [
        "draft",
        "pending_approval",
        "active",
        "rejected",
        "sold",
        "expired",
        "suspended",
        "deleted",
      ],
      report_reason: [
        "scam",
        "fake_product",
        "wrong_information",
        "offensive",
        "illegal",
        "duplicate",
        "spam",
        "other",
      ],
      report_status: ["open", "under_review", "actioned", "dismissed"],
      report_target: ["product", "seller", "business", "message", "review"],
      review_status: ["pending", "approved", "rejected"],
      seller_type: ["individual", "business"],
      subscription_status: [
        "active",
        "past_due",
        "cancelled",
        "expired",
        "trialing",
      ],
      user_role: ["buyer", "seller", "business", "moderator", "admin"],
      verification_kind: ["identity", "business", "phone", "address"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
