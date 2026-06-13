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
      affiliate_links: {
        Row: {
          active: boolean
          campaign: string | null
          channel: string | null
          created_at: string
          created_by: string | null
          id: string
          partner_id: string
          short_code: string
          target_url: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string
          utm_source: string
        }
        Insert: {
          active?: boolean
          campaign?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          partner_id: string
          short_code: string
          target_url: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
        }
        Update: {
          active?: boolean
          campaign?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          partner_id?: string
          short_code?: string
          target_url?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean
          bg_color: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean
          bg_color?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean
          bg_color?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversions: {
        Row: {
          click_id: string | null
          commission_amount: number
          created_at: string
          gross_amount: number
          id: string
          link_id: string | null
          network: string | null
          partner_id: string
          partner_order_id: string | null
          payload: Json | null
          status: Database["public"]["Enums"]["conversion_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          click_id?: string | null
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          link_id?: string | null
          network?: string | null
          partner_id: string
          partner_order_id?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["conversion_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          click_id?: string | null
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          link_id?: string | null
          network?: string | null
          partner_id?: string
          partner_order_id?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["conversion_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "link_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string
          created_at: string
          delivered_at: string | null
          distance_km: number | null
          id: string
          notes: string | null
          order_id: string
          partner_id: string
          payout_amount: number | null
          picked_up_at: string | null
          status: Database["public"]["Enums"]["assignment_status_t"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string
          created_at?: string
          delivered_at?: string | null
          distance_km?: number | null
          id?: string
          notes?: string | null
          order_id: string
          partner_id: string
          payout_amount?: number | null
          picked_up_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status_t"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string
          created_at?: string
          delivered_at?: string | null
          distance_km?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          partner_id?: string
          payout_amount?: number | null
          picked_up_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["user_id"]
          },
        ]
      }
      delivery_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["delivery_doc_type"]
          id: string
          partner_id: string
          storage_path: string
          uploaded_at: string
          verified: boolean
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["delivery_doc_type"]
          id?: string
          partner_id: string
          storage_path: string
          uploaded_at?: string
          verified?: boolean
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["delivery_doc_type"]
          id?: string
          partner_id?: string
          storage_path?: string
          uploaded_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "delivery_documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["user_id"]
          },
        ]
      }
      delivery_earnings_ledger: {
        Row: {
          amount: number
          assignment_id: string | null
          created_at: string
          id: string
          partner_id: string
          type: Database["public"]["Enums"]["earning_type_t"]
        }
        Insert: {
          amount: number
          assignment_id?: string | null
          created_at?: string
          id?: string
          partner_id: string
          type?: Database["public"]["Enums"]["earning_type_t"]
        }
        Update: {
          amount?: number
          assignment_id?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          type?: Database["public"]["Enums"]["earning_type_t"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_earnings_ledger_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_earnings_ledger_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["user_id"]
          },
        ]
      }
      delivery_partners: {
        Row: {
          city: string
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          is_online: boolean
          kyc_rejection_reason: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status_t"]
          last_seen_at: string | null
          phone: string
          rating: number | null
          total_deliveries: number
          updated_at: string
          user_id: string
          vehicle_number: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type_t"]
        }
        Insert: {
          city: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          is_online?: boolean
          kyc_rejection_reason?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status_t"]
          last_seen_at?: string | null
          phone: string
          rating?: number | null
          total_deliveries?: number
          updated_at?: string
          user_id: string
          vehicle_number: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type_t"]
        }
        Update: {
          city?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          is_online?: boolean
          kyc_rejection_reason?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status_t"]
          last_seen_at?: string | null
          phone?: string
          rating?: number | null
          total_deliveries?: number
          updated_at?: string
          user_id?: string
          vehicle_number?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type_t"]
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          created_at: string
          device: string | null
          id: string
          ip_hash: string | null
          link_id: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          link_id: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      ondc_participants: {
        Row: {
          active: boolean
          created_at: string
          domain: string | null
          encr_pub_key: string | null
          id: string
          registry_env: string
          role: string
          signing_pub_key: string | null
          subscriber_id: string
          ukid: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          domain?: string | null
          encr_pub_key?: string | null
          id?: string
          registry_env?: string
          role: string
          signing_pub_key?: string | null
          subscriber_id: string
          ukid?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          domain?: string | null
          encr_pub_key?: string | null
          id?: string
          registry_env?: string
          role?: string
          signing_pub_key?: string | null
          subscriber_id?: string
          ukid?: string | null
        }
        Relationships: []
      }
      ondc_transactions: {
        Row: {
          action: string
          created_at: string
          direction: string
          id: string
          message_id: string | null
          payload: Json | null
          status: string | null
          transaction_id: string
        }
        Insert: {
          action: string
          created_at?: string
          direction: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          status?: string | null
          transaction_id: string
        }
        Update: {
          action?: string
          created_at?: string
          direction?: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          status?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          delivery_partner_id: string | null
          delivery_status:
            | Database["public"]["Enums"]["assignment_status_t"]
            | null
          drop_lat: number | null
          drop_lng: number | null
          external_order_id: string | null
          id: string
          items: Json
          payment_ref: string | null
          pickup_address: Json | null
          pickup_lat: number | null
          pickup_lng: number | null
          shipping_address: Json | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_partner_id?: string | null
          delivery_status?:
            | Database["public"]["Enums"]["assignment_status_t"]
            | null
          drop_lat?: number | null
          drop_lng?: number | null
          external_order_id?: string | null
          id?: string
          items?: Json
          payment_ref?: string | null
          pickup_address?: Json | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          shipping_address?: Json | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_partner_id?: string | null
          delivery_status?:
            | Database["public"]["Enums"]["assignment_status_t"]
            | null
          drop_lat?: number | null
          drop_lng?: number | null
          external_order_id?: string | null
          id?: string
          items?: Json
          payment_ref?: string | null
          pickup_address?: Json | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          shipping_address?: Json | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_offers: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          partner_id: string
          title: string
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          partner_id: string
          title: string
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          partner_id?: string
          title?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          affiliate_network: string | null
          base_url: string | null
          category_id: string | null
          commission_pct: number
          created_at: string
          description: string | null
          featured: boolean
          id: string
          logo_url: string | null
          name: string
          slug: string
          type: Database["public"]["Enums"]["partner_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_network?: string | null
          base_url?: string | null
          category_id?: string | null
          commission_pct?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_network?: string | null
          base_url?: string | null
          category_id?: string | null
          commission_pct?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_city: string | null
          full_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_city?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_city?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
          reward: number | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
          reward?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
          reward?: number | null
          status?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      vendor_products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          ondc_attrs: Json | null
          price: number
          sku: string | null
          stock: number
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          ondc_attrs?: Json | null
          price?: number
          sku?: string | null
          stock?: number
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          ondc_attrs?: Json | null
          price?: number
          sku?: string | null
          stock?: number
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          created_at: string
          gstin: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          pan: string | null
          payout_account: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          pan?: string | null
          payout_account?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          pan?: string | null
          payout_account?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          id: string
          ref: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          id?: string
          ref?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          ref?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "vendor" | "admin" | "super_admin" | "delivery"
      assignment_status_t:
        | "assigned"
        | "accepted"
        | "rejected"
        | "picked_up"
        | "delivered"
        | "cancelled"
      conversion_status: "pending" | "approved" | "rejected" | "paid"
      delivery_doc_type:
        | "aadhaar"
        | "pan"
        | "dl"
        | "rc"
        | "vehicle_photo"
        | "selfie"
      earning_type_t: "delivery_fee" | "tip" | "bonus" | "adjustment"
      kyc_status: "pending" | "approved" | "rejected"
      kyc_status_t: "pending" | "approved" | "rejected"
      order_source: "own" | "ondc" | "affiliate"
      order_status:
        | "placed"
        | "accepted"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      partner_type: "affiliate" | "ondc" | "own"
      vehicle_type_t: "bike" | "scooter" | "cycle" | "car"
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
      app_role: ["user", "vendor", "admin", "super_admin", "delivery"],
      assignment_status_t: [
        "assigned",
        "accepted",
        "rejected",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      conversion_status: ["pending", "approved", "rejected", "paid"],
      delivery_doc_type: [
        "aadhaar",
        "pan",
        "dl",
        "rc",
        "vehicle_photo",
        "selfie",
      ],
      earning_type_t: ["delivery_fee", "tip", "bonus", "adjustment"],
      kyc_status: ["pending", "approved", "rejected"],
      kyc_status_t: ["pending", "approved", "rejected"],
      order_source: ["own", "ondc", "affiliate"],
      order_status: [
        "placed",
        "accepted",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      partner_type: ["affiliate", "ondc", "own"],
      vehicle_type_t: ["bike", "scooter", "cycle", "car"],
    },
  },
} as const
