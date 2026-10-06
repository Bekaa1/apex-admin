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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ad_stores: {
        Row: {
          actually_paid: number | null
          ad_id: string | null
          allocated_cost: number | null
          created_at: string | null
          id: string
          status: string | null
          store_id: string | null
        }
        Insert: {
          actually_paid?: number | null
          ad_id?: string | null
          allocated_cost?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          store_id?: string | null
        }
        Update: {
          actually_paid?: number | null
          ad_id?: string | null
          allocated_cost?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_store_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_zone_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaign_cards"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "broad_target_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaigns_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_daily_plays_by_campaign"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_stores_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "partner_campaign_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_view_history: {
        Row: {
          ad_id: string | null
          cart_id: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          location: unknown
          store_id: string | null
          user_id: string | null
          viewed_at: string | null
          zone_id: string | null
        }
        Insert: {
          ad_id?: string | null
          cart_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          location?: unknown
          store_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
          zone_id?: string | null
        }
        Update: {
          ad_id?: string | null
          cart_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          location?: unknown
          store_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_store_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_zone_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaign_cards"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "broad_target_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaigns_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_daily_plays_by_campaign"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_view_history_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "partner_campaign_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_history_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_history_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "partner_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_history_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["cart_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_view_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_view_history_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ad_view_history_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ad_view_history_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ad_view_history_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_zones: {
        Row: {
          ad_id: string | null
          created_at: string | null
          id: string
          trigger_count: number | null
          zone_id: string | null
        }
        Insert: {
          ad_id?: string | null
          created_at?: string | null
          id?: string
          trigger_count?: number | null
          zone_id?: string | null
        }
        Update: {
          ad_id?: string | null
          created_at?: string | null
          id?: string
          trigger_count?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_store_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_zone_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaign_cards"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "broad_target_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaigns_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_daily_plays_by_campaign"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "ad_zones_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "partner_campaign_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ad_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ad_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ad_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          budget: number | null
          budget_used_pct: number | null
          content_url: string | null
          cover_original_filename: string | null
          created_at: string | null
          display_id: number
          earned_points: number | null
          end_date: string | null
          hours_per_day: number | null
          hours_used_pct: number | null
          id: string
          is_active: boolean | null
          name: string | null
          remaining_budget_pct: number | null
          remaining_impressions: number | null
          spent_budget: number
          start_date: string | null
          status: Database["public"]["Enums"]["ad_status"] | null
          status_color: string | null
          status_label_ru: string | null
          store_id: string | null
          store_name: string | null
          title: string | null
          total_hours: number | null
          used_hours: number | null
          user_id: string | null
          video_original_filename: string | null
          video_url: string | null
          zone_id: string | null
        }
        Insert: {
          budget?: number | null
          budget_used_pct?: number | null
          content_url?: string | null
          cover_original_filename?: string | null
          created_at?: string | null
          display_id?: number
          earned_points?: number | null
          end_date?: string | null
          hours_per_day?: number | null
          hours_used_pct?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          remaining_budget_pct?: number | null
          remaining_impressions?: number | null
          spent_budget?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          status_color?: string | null
          status_label_ru?: string | null
          store_id?: string | null
          store_name?: string | null
          title?: string | null
          total_hours?: number | null
          used_hours?: number | null
          user_id?: string | null
          video_original_filename?: string | null
          video_url?: string | null
          zone_id?: string | null
        }
        Update: {
          budget?: number | null
          budget_used_pct?: number | null
          content_url?: string | null
          cover_original_filename?: string | null
          created_at?: string | null
          display_id?: number
          earned_points?: number | null
          end_date?: string | null
          hours_per_day?: number | null
          hours_used_pct?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          remaining_budget_pct?: number | null
          remaining_impressions?: number | null
          spent_budget?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          status_color?: string | null
          status_label_ru?: string | null
          store_id?: string | null
          store_name?: string | null
          title?: string | null
          total_hours?: number | null
          used_hours?: number | null
          user_id?: string | null
          video_original_filename?: string | null
          video_url?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_backup_20261006: {
        Row: {
          budget: number | null
          display_id: number | null
          hours_per_day: number | null
          id: string | null
          status: Database["public"]["Enums"]["ad_status"] | null
          total_hours: number | null
        }
        Insert: {
          budget?: number | null
          display_id?: number | null
          hours_per_day?: number | null
          id?: string | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          total_hours?: number | null
        }
        Update: {
          budget?: number | null
          display_id?: number | null
          hours_per_day?: number | null
          id?: string | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          total_hours?: number | null
        }
        Relationships: []
      }
      auction_bids: {
        Row: {
          amount: number | null
          auction_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          auction_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          auction_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          created_at: string | null
          current_price: number | null
          description: string | null
          end_at: string | null
          hourly_traffic: number | null
          id: string
          min_bid: number | null
          min_bid_step: number | null
          start_at: string | null
          status: string | null
          store_id: string | null
          title: string | null
          updated_at: string | null
          winner_id: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_price?: number | null
          description?: string | null
          end_at?: string | null
          hourly_traffic?: number | null
          id?: string
          min_bid?: number | null
          min_bid_step?: number | null
          start_at?: string | null
          status?: string | null
          store_id?: string | null
          title?: string | null
          updated_at?: string | null
          winner_id?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_price?: number | null
          description?: string | null
          end_at?: string | null
          hourly_traffic?: number | null
          id?: string
          min_bid?: number | null
          min_bid_step?: number | null
          start_at?: string | null
          status?: string | null
          store_id?: string | null
          title?: string | null
          updated_at?: string | null
          winner_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "auctions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "auctions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "auctions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "auctions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "partner_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      beacons: {
        Row: {
          box_number: string | null
          created_at: string | null
          device_identifier: string | null
          id: string
          status: string | null
          store_id: string | null
          zone_id: string | null
        }
        Insert: {
          box_number?: string | null
          created_at?: string | null
          device_identifier?: string | null
          id?: string
          status?: string | null
          store_id?: string | null
          zone_id?: string | null
        }
        Update: {
          box_number?: string | null
          created_at?: string | null
          device_identifier?: string | null
          id?: string
          status?: string | null
          store_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "beacons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beacons_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "beacons_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "beacons_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "beacons_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      cartplayer_playback_sessions: {
        Row: {
          ad_id: string
          cart_id: string
          completed_at: string | null
          duration_seconds: number | null
          id: string
          prepared_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          ad_id: string
          cart_id: string
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          prepared_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          ad_id?: string
          cart_id?: string
          completed_at?: string | null
          duration_seconds?: number | null
          id?: string
          prepared_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      carts: {
        Row: {
          assigned_user_id: string | null
          battery_level: number | null
          cart_number: string | null
          created_at: string | null
          current_zone_id: string | null
          display_id: number
          id: string
          last_location: unknown
          last_ping_at: string | null
          last_seen_at: string | null
          last_zone_entered_at: string | null
          status: Database["public"]["Enums"]["cart_status"] | null
          store_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          battery_level?: number | null
          cart_number?: string | null
          created_at?: string | null
          current_zone_id?: string | null
          display_id?: number
          id?: string
          last_location?: unknown
          last_ping_at?: string | null
          last_seen_at?: string | null
          last_zone_entered_at?: string | null
          status?: Database["public"]["Enums"]["cart_status"] | null
          store_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          battery_level?: number | null
          cart_number?: string | null
          created_at?: string | null
          current_zone_id?: string | null
          display_id?: number
          id?: string
          last_location?: unknown
          last_ping_at?: string | null
          last_seen_at?: string | null
          last_zone_entered_at?: string | null
          status?: Database["public"]["Enums"]["cart_status"] | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "partner_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_current_zone_id_fkey"
            columns: ["current_zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "carts_current_zone_id_fkey"
            columns: ["current_zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "carts_current_zone_id_fkey"
            columns: ["current_zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "carts_current_zone_id_fkey"
            columns: ["current_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_comments: {
        Row: {
          comment: string
          created_at: string
          creative_id: string
          id: string
          partner_id: string
          status: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          creative_id: string
          id?: string
          partner_id: string
          status?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          creative_id?: string
          id?: string
          partner_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_store_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_zone_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaign_cards"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "advertiser_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "broad_target_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "my_campaigns_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "my_daily_plays_by_campaign"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "creative_comments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "partner_campaign_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_comments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "partner_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      filtr: {
        Row: {
          en: string | null
          id: string
          ru: string | null
        }
        Insert: {
          en?: string | null
          id: string
          ru?: string | null
        }
        Update: {
          en?: string | null
          id?: string
          ru?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          campaign_id: string
          due_at: string | null
          id: string
          issued_at: string
          status: string
          store_id: string
        }
        Insert: {
          amount: number
          campaign_id: string
          due_at?: string | null
          id?: string
          issued_at?: string
          status?: string
          store_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          due_at?: string | null
          id?: string
          issued_at?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_store_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_zone_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaign_cards"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "advertiser_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "broad_target_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "my_campaigns_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "my_daily_plays_by_campaign"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "partner_campaign_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          partner_id: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          partner_id?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          partner_id?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "partner_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          accrued_amount: number
          id: string
          paid_amount: number
          partner_revenue_id: string
          payout_date: string | null
          remaining_amount: number
          status: string
        }
        Insert: {
          accrued_amount?: number
          id?: string
          paid_amount?: number
          partner_revenue_id: string
          payout_date?: string | null
          remaining_amount?: number
          status?: string
        }
        Update: {
          accrued_amount?: number
          id?: string
          paid_amount?: number
          partner_revenue_id?: string
          payout_date?: string | null
          remaining_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_revenue_id_fkey"
            columns: ["partner_revenue_id"]
            isOneToOne: false
            referencedRelation: "partner_revenue"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_revenue: {
        Row: {
          apex_share: number
          created_at: string
          id: string
          model: string
          partner_id: string
          partner_share: number
          period: unknown
          store_id: string | null
          total_ad_revenue: number
        }
        Insert: {
          apex_share?: number
          created_at?: string
          id?: string
          model: string
          partner_id: string
          partner_share?: number
          period: unknown
          store_id?: string | null
          total_ad_revenue?: number
        }
        Update: {
          apex_share?: number
          created_at?: string
          id?: string
          model?: string
          partner_id?: string
          partner_share?: number
          period?: unknown
          store_id?: string | null
          total_ad_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_revenue_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "partner_revenue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          contract_type: string
          created_at: string
          id: string
          legal_name: string | null
          name: string
        }
        Insert: {
          contract_type: string
          created_at?: string
          id?: string
          legal_name?: string | null
          name: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          id?: string
          legal_name?: string | null
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          method: string | null
          paid_at: string
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          method?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          method?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_logs: {
        Row: {
          ad_id: string | null
          cart_id: string | null
          completed: boolean
          duration_seconds: number | null
          id: string
          location: unknown
          played_at: string | null
          trigger_type: string
          zone_id: string | null
        }
        Insert: {
          ad_id?: string | null
          cart_id?: string | null
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          location?: unknown
          played_at?: string | null
          trigger_type?: string
          zone_id?: string | null
        }
        Update: {
          ad_id?: string | null
          cart_id?: string | null
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          location?: unknown
          played_at?: string | null
          trigger_type?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_store_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_zone_names"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_campaign_cards"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertiser_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "broad_target_campaign_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_campaigns_stats"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "my_daily_plays_by_campaign"
            referencedColumns: ["ad_id"]
          },
          {
            foreignKeyName: "playback_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "partner_campaign_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_logs_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_logs_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "partner_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_logs_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["cart_id"]
          },
          {
            foreignKeyName: "playback_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "playback_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "playback_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "playback_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          file_url: string | null
          format: string
          generated_at: string
          id: string
          partner_id: string
          period_end: string
          period_start: string
          store_id: string | null
        }
        Insert: {
          file_url?: string | null
          format: string
          generated_at?: string
          id?: string
          partner_id: string
          period_end: string
          period_start: string
          store_id?: string | null
        }
        Update: {
          file_url?: string | null
          format?: string
          generated_at?: string
          id?: string
          partner_id?: string
          period_end?: string
          period_start?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      store_daily_stats: {
        Row: {
          bar_height: number | null
          day_index: number | null
          day_number: number | null
          stat_date: string
          store_id: string
          total_plays: number | null
        }
        Insert: {
          bar_height?: number | null
          day_index?: number | null
          day_number?: number | null
          stat_date: string
          store_id: string
          total_plays?: number | null
        }
        Update: {
          bar_height?: number | null
          day_index?: number | null
          day_number?: number | null
          stat_date?: string
          store_id?: string
          total_plays?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          cart_ids: string[] | null
          city: string | null
          created_at: string | null
          id: string
          name: string
          partner_id: string | null
          timezone: string | null
        }
        Insert: {
          address?: string | null
          cart_ids?: string[] | null
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          partner_id?: string | null
          timezone?: string | null
        }
        Update: {
          address?: string | null
          cart_ids?: string[] | null
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          partner_id?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          partner_id: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          partner_id: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          partner_id?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "partner_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tariffs: {
        Row: {
          badge: string | null
          can_select_store: boolean
          can_select_zone: boolean
          created_at: string
          exclusive_zone: boolean
          has_sound: boolean
          id: string
          min_amount: number
          name: string
          price_per_play: number
          sort_order: number
        }
        Insert: {
          badge?: string | null
          can_select_store?: boolean
          can_select_zone?: boolean
          created_at?: string
          exclusive_zone?: boolean
          has_sound?: boolean
          id?: string
          min_amount: number
          name: string
          price_per_play: number
          sort_order: number
        }
        Update: {
          badge?: string | null
          can_select_store?: boolean
          can_select_zone?: boolean
          created_at?: string
          exclusive_zone?: boolean
          has_sound?: boolean
          id?: string
          min_amount?: number
          name?: string
          price_per_play?: number
          sort_order?: number
        }
        Relationships: []
      }
      user_store_access: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "partner_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          balance: number | null
          bin: string | null
          company_name: string | null
          created_at: string | null
          display_id: number
          display_name: string | null
          email: string | null
          finance_visible: boolean
          full_name: string | null
          id: string
          is_active: boolean | null
          partner_id: string | null
          partner_role: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number | null
          bin?: string | null
          company_name?: string | null
          created_at?: string | null
          display_id?: number
          display_name?: string | null
          email?: string | null
          finance_visible?: boolean
          full_name?: string | null
          id: string
          is_active?: boolean | null
          partner_id?: string | null
          partner_role?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number | null
          bin?: string | null
          company_name?: string | null
          created_at?: string | null
          display_id?: number
          display_name?: string | null
          email?: string | null
          finance_visible?: boolean
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string | null
          partner_role?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string | null
          description: string | null
          icon_emoji: string
          id: string
          name: string
          price_per_hour: number
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_emoji?: string
          id?: string
          name: string
          price_per_hour?: number
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_emoji?: string
          id?: string
          name?: string
          price_per_hour?: number
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ad_campaign_stats: {
        Row: {
          ad_id: string | null
          earned_points: number | null
          name: string | null
          plays_month: number | null
          plays_today: number | null
          plays_week: number | null
          title: string | null
          total_plays: number | null
          user_id: string | null
        }
        Relationships: []
      }
      ad_store_names: {
        Row: {
          ad_id: string | null
          store_name: string | null
        }
        Relationships: []
      }
      ad_zone_names: {
        Row: {
          ad_id: string | null
          zone_id: string | null
          zone_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "all_zone_top"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_zone_shares"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_stats"
            referencedColumns: ["zone_id"]
          },
          {
            foreignKeyName: "ads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_campaign_cards: {
        Row: {
          ad_id: string | null
          budget: number | null
          budget_used: number | null
          hours_progress_pct: number | null
          name: string | null
          status: Database["public"]["Enums"]["ad_status"] | null
          status_color: string | null
          status_label_ru: string | null
          thumbnail_url: string | null
          total_hours: number | null
          used_hours: number | null
          user_id: string | null
        }
        Insert: {
          ad_id?: string | null
          budget?: number | null
          budget_used?: never
          hours_progress_pct?: never
          name?: string | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          status_color?: string | null
          status_label_ru?: string | null
          thumbnail_url?: string | null
          total_hours?: number | null
          used_hours?: number | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string | null
          budget?: number | null
          budget_used?: never
          hours_progress_pct?: never
          name?: string | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          status_color?: string | null
          status_label_ru?: string | null
          thumbnail_url?: string | null
          total_hours?: number | null
          used_hours?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      advertiser_daily_stats: {
        Row: {
          stat_date: string | null
          total_plays: number | null
          user_id: string | null
        }
        Relationships: []
      }
      advertiser_stats: {
        Row: {
          ad_id: string | null
          content_url: string | null
          created_at: string | null
          plays_today: number | null
          plays_week: number | null
          status: Database["public"]["Enums"]["ad_status"] | null
          title: string | null
          total_plays: number | null
          user_id: string | null
        }
        Relationships: []
      }
      advertiser_total_stats: {
        Row: {
          total_ads: number | null
          total_plays: number | null
          user_id: string | null
        }
        Relationships: []
      }
      all_cart_fleet: {
        Row: {
          avg_battery_level: number | null
          low_battery_count: number | null
          offline_carts: number | null
          online_carts: number | null
          total_carts: number | null
        }
        Relationships: []
      }
      all_store: {
        Row: {
          plays_month: number | null
          plays_today: number | null
          plays_week: number | null
          stores_count: number | null
          total_plays: number | null
        }
        Relationships: []
      }
      all_store_daily: {
        Row: {
          bar_height: number | null
          day_index: number | null
          day_number: number | null
          stat_date: string | null
          total_plays: number | null
        }
        Relationships: []
      }
      all_zone: {
        Row: {
          plays_last_24h: number | null
          zones_count: number | null
        }
        Relationships: []
      }
      all_zone_top: {
        Row: {
          pct_share: number | null
          plays_last_24h: number | null
          store_name: string | null
          zone_id: string | null
          zone_name: string | null
          zone_rank: number | null
        }
        Relationships: []
      }
      broad_target_campaign_stats: {
        Row: {
          ad_id: string | null
          plays_today: number | null
          plays_week: number | null
          stores_reached: number | null
          targets_all_stores: boolean | null
          targets_all_zones: boolean | null
          title: string | null
          total_plays: number | null
          user_id: string | null
          zones_reached: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      global_ad_stats: {
        Row: {
          plays_month: number | null
          plays_today: number | null
          plays_week: number | null
          total_plays: number | null
        }
        Relationships: []
      }
      my_ad_stats_summary: {
        Row: {
          plays_month: number | null
          plays_prev_week: number | null
          plays_today: number | null
          plays_total: number | null
          plays_week: number | null
          plays_yesterday: number | null
        }
        Relationships: []
      }
      my_campaign_locations: {
        Row: {
          ad_id: string | null
          kind: string | null
          location_id: string | null
          location_name: string | null
          parent_store_id: string | null
        }
        Relationships: []
      }
      my_campaign_store_shares: {
        Row: {
          ad_id: string | null
          store_id: string | null
          store_name: string | null
          store_plays: number | null
          store_share_fraction: number | null
          store_share_pct: number | null
        }
        Relationships: []
      }
      my_campaign_zone_shares: {
        Row: {
          ad_id: string | null
          zone_id: string | null
          zone_name: string | null
          zone_plays: number | null
          zone_rank: number | null
          zone_share_fraction: number | null
          zone_share_pct: number | null
        }
        Relationships: []
      }
      my_campaigns_stats: {
        Row: {
          ad_id: string | null
          budget: number | null
          budget_used_fraction: number | null
          budget_used_pct: number | null
          created_at: string | null
          end_date: string | null
          hours_used_fraction: number | null
          hours_used_pct: number | null
          name: string | null
          remaining_budget: number | null
          remaining_budget_pct: number | null
          spent_budget: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["ad_status"] | null
          status_color: string | null
          status_label_ru: string | null
          store_name: string | null
          title: string | null
          total_hours: number | null
          total_plays: number | null
          used_hours: number | null
        }
        Relationships: []
      }
      my_daily_plays: {
        Row: {
          play_date: string | null
          plays: number | null
        }
        Relationships: []
      }
      my_daily_plays_all_campaigns: {
        Row: {
          play_date: string | null
          plays: number | null
        }
        Relationships: []
      }
      my_daily_plays_by_campaign: {
        Row: {
          ad_id: string | null
          play_date: string | null
          plays: number | null
        }
        Relationships: []
      }
      partner_campaign_view: {
        Row: {
          actually_paid: number | null
          actually_paid_label: string | null
          allocated_cost: number | null
          allocated_cost_label: string | null
          budget_progress: number | null
          end_date: string | null
          id: string | null
          impressions_label: string | null
          name: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["ad_status"] | null
          status_label_ru: string | null
          store_id: string | null
          store_status: string | null
          time_progress: number | null
          time_total_label: string | null
          time_used_label: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ad_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_dashboard_stats: {
        Row: {
          active_advertisers: number | null
          active_campaigns: number | null
          carts_offline: number | null
          carts_online: number | null
          carts_total: number | null
          completed_campaigns: number | null
          devices_offline: number | null
          devices_online: number | null
          devices_total: number | null
          impressions_month_label: string | null
          impressions_today_label: string | null
          impressions_week_label: string | null
          total_cost: number | null
          total_cost_label: string | null
          total_impressions: number | null
          total_impressions_label: string | null
          total_paid: number | null
          total_paid_label: string | null
        }
        Relationships: []
      }
      partner_dashboard_stats_by_store: {
        Row: {
          active_advertisers: number | null
          active_campaigns: number | null
          carts_offline: number | null
          carts_online: number | null
          carts_total: number | null
          completed_campaigns: number | null
          devices_offline: number | null
          devices_online: number | null
          devices_total: number | null
          impressions_month_label: string | null
          impressions_today_label: string | null
          impressions_week_label: string | null
          store_id: string | null
          store_name: string | null
          total_cost: number | null
          total_cost_label: string | null
          total_impressions: number | null
          total_impressions_label: string | null
          total_paid: number | null
          total_paid_label: string | null
        }
        Insert: {
          active_advertisers?: never
          active_campaigns?: never
          carts_offline?: never
          carts_online?: never
          carts_total?: never
          completed_campaigns?: never
          devices_offline?: never
          devices_online?: never
          devices_total?: never
          impressions_month_label?: never
          impressions_today_label?: never
          impressions_week_label?: never
          store_id?: string | null
          store_name?: string | null
          total_cost?: never
          total_cost_label?: never
          total_impressions?: never
          total_impressions_label?: never
          total_paid?: never
          total_paid_label?: never
        }
        Update: {
          active_advertisers?: never
          active_campaigns?: never
          carts_offline?: never
          carts_online?: never
          carts_total?: never
          completed_campaigns?: never
          devices_offline?: never
          devices_online?: never
          devices_total?: never
          impressions_month_label?: never
          impressions_today_label?: never
          impressions_week_label?: never
          store_id?: string | null
          store_name?: string | null
          total_cost?: never
          total_cost_label?: never
          total_impressions?: never
          total_impressions_label?: never
          total_paid?: never
          total_paid_label?: never
        }
        Relationships: []
      }
      partner_devices: {
        Row: {
          battery_label: string | null
          battery_level: number | null
          cart_number: string | null
          id: string | null
          last_seen_label: string | null
          status: Database["public"]["Enums"]["cart_status"] | null
          status_label: string | null
          store_name: string | null
          summary_value_label: string | null
        }
        Relationships: []
      }
      partner_finance_stats: {
        Row: {
          accrued_amount: number | null
          accrued_amount_label: string | null
          apex_share: number | null
          apex_share_label: string | null
          last_payout_date: string | null
          paid_amount: number | null
          paid_amount_label: string | null
          paid_invoices_count: number | null
          partner_share: number | null
          partner_share_label: string | null
          payout_summary_label: string | null
          remaining_amount: number | null
          remaining_amount_label: string | null
          total_ad_revenue: number | null
          total_ad_revenue_label: string | null
          total_campaign_cost: number | null
          total_campaign_cost_label: string | null
          total_expected: number | null
          total_expected_label: string | null
          total_invoiced: number | null
          total_invoiced_label: string | null
          total_paid: number | null
          total_paid_label: string | null
          unpaid_invoices_count: number | null
        }
        Relationships: []
      }
      partner_finance_stats_by_store: {
        Row: {
          accrued_amount: number | null
          accrued_amount_label: string | null
          apex_share: number | null
          apex_share_label: string | null
          last_payout_date: string | null
          paid_amount: number | null
          paid_amount_label: string | null
          paid_invoices_count: number | null
          partner_share: number | null
          partner_share_label: string | null
          payout_summary_label: string | null
          remaining_amount: number | null
          remaining_amount_label: string | null
          store_id: string | null
          store_name: string | null
          total_ad_revenue: number | null
          total_ad_revenue_label: string | null
          total_campaign_cost: number | null
          total_campaign_cost_label: string | null
          total_expected: number | null
          total_expected_label: string | null
          total_invoiced: number | null
          total_invoiced_label: string | null
          total_paid: number | null
          total_paid_label: string | null
          unpaid_invoices_count: number | null
        }
        Insert: {
          accrued_amount?: never
          accrued_amount_label?: never
          apex_share?: never
          apex_share_label?: never
          last_payout_date?: never
          paid_amount?: never
          paid_amount_label?: never
          paid_invoices_count?: never
          partner_share?: never
          partner_share_label?: never
          payout_summary_label?: never
          remaining_amount?: never
          remaining_amount_label?: never
          store_id?: string | null
          store_name?: string | null
          total_ad_revenue?: never
          total_ad_revenue_label?: never
          total_campaign_cost?: never
          total_campaign_cost_label?: never
          total_expected?: never
          total_expected_label?: never
          total_invoiced?: never
          total_invoiced_label?: never
          total_paid?: never
          total_paid_label?: never
          unpaid_invoices_count?: never
        }
        Update: {
          accrued_amount?: never
          accrued_amount_label?: never
          apex_share?: never
          apex_share_label?: never
          last_payout_date?: never
          paid_amount?: never
          paid_amount_label?: never
          paid_invoices_count?: never
          partner_share?: never
          partner_share_label?: never
          payout_summary_label?: never
          remaining_amount?: never
          remaining_amount_label?: never
          store_id?: string | null
          store_name?: string | null
          total_ad_revenue?: never
          total_ad_revenue_label?: never
          total_campaign_cost?: never
          total_campaign_cost_label?: never
          total_expected?: never
          total_expected_label?: never
          total_invoiced?: never
          total_invoiced_label?: never
          total_paid?: never
          total_paid_label?: never
          unpaid_invoices_count?: never
        }
        Relationships: []
      }
      partner_statistics_summary: {
        Row: {
          active_zones: number | null
          active_zones_label: string | null
          completed_plays: number | null
          completed_plays_label: string | null
          plays_today: number | null
          plays_today_label: string | null
          total_plays: number | null
          total_plays_label: string | null
        }
        Relationships: []
      }
      partner_store_playback_stats: {
        Row: {
          plays: number | null
          plays_label: string | null
          share_progress: number | null
          store_id: string | null
          store_name: string | null
        }
        Relationships: []
      }
      partner_stores: {
        Row: {
          city: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          city?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          city?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      partner_team_members: {
        Row: {
          created_at: string | null
          email: string | null
          finance_visible: boolean | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          partner_role: string | null
          partner_role_label_ru: string | null
          status_label_ru: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          finance_visible?: boolean | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          partner_role?: string | null
          partner_role_label_ru?: never
          status_label_ru?: never
        }
        Update: {
          created_at?: string | null
          email?: string | null
          finance_visible?: boolean | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          partner_role?: string | null
          partner_role_label_ru?: never
          status_label_ru?: never
        }
        Relationships: []
      }
      store_cart_connectivity: {
        Row: {
          offline_carts: number | null
          online_carts: number | null
          store_id: string | null
          total_carts: number | null
        }
        Relationships: []
      }
      store_cart_stats: {
        Row: {
          cart_id: string | null
          plays_month: number | null
          plays_today: number | null
          plays_week: number | null
          store_id: string | null
          total_plays: number | null
        }
        Relationships: []
      }
      store_stats: {
        Row: {
          plays_month: number | null
          plays_today: number | null
          plays_week: number | null
          store_id: string | null
          total_plays: number | null
        }
        Relationships: []
      }
      user_ad_stats: {
        Row: {
          plays_month: number | null
          plays_today: number | null
          plays_week: number | null
          total_plays: number | null
          user_id: string | null
        }
        Relationships: []
      }
      zone_stats: {
        Row: {
          pct_share: number | null
          plays_last_24h: number | null
          store_id: string | null
          zone_id: string | null
          zone_name: string | null
          zone_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "my_campaign_store_shares"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_dashboard_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_finance_stats_by_store"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_store_playback_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_connectivity"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_cart_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      check_phone_exists: { Args: { p_phone: string }; Returns: boolean }
      complete_ad_playback: {
        Args: { p_duration_seconds: number; p_session_id: string }
        Returns: string
      }
      complete_contact_registration: {
        Args: { p_bin?: string; p_company_name?: string; p_full_name: string }
        Returns: undefined
      }
      complete_phone_registration: {
        Args: { p_bin?: string; p_company_name?: string; p_full_name: string }
        Returns: undefined
      }
      complete_signup_profile: {
        Args: { p_bin: string; p_company_name: string; p_full_name: string }
        Returns: undefined
      }
      current_finance_visible: { Args: never; Returns: boolean }
      current_partner_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_email_by_phone: { Args: { p_phone: string }; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      handle_beacon_detected: {
        Args: {
          p_cart_id: string
          p_device_identifier: string
          p_duration_seconds?: number
        }
        Returns: string
      }
      is_apex_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      prepare_ad_playback: {
        Args: { p_cart_id: string; p_device_identifier: string }
        Returns: Json
      }
      select_ad_for_zone: {
        Args: { p_store_id: string; p_zone_id: string }
        Returns: string
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      ad_status:
        | "pending"
        | "active"
        | "rejected"
        | "draft"
        | "archived"
        | "deleted"
        | "paused"
        | "hours_ended"
        | "budget_ended"
        | "completed"
      cart_status: "active" | "inactive" | "maintenance" | "online" | "offline"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      ad_status: [
        "pending",
        "active",
        "rejected",
        "draft",
        "archived",
        "deleted",
        "paused",
        "hours_ended",
        "budget_ended",
        "completed",
      ],
      cart_status: ["active", "inactive", "maintenance", "online", "offline"],
    },
  },
} as const
