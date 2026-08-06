// =========================================================
// ISLAMABAD EVENT PORTAL - SUPABASE CLIENT SERVICE
// Connects to live Supabase Postgres backend & Auth API
// =========================================================

import { ENV_CONFIG } from './config.js';
import { INITIAL_EVENTS } from './mockEvents.js';

class SupabaseService {
  constructor() {
    this.url = ENV_CONFIG.SUPABASE_URL;
    this.anonKey = ENV_CONFIG.SUPABASE_ANON_KEY;
    this.client = null;
    this.initClient();
  }

  initClient() {
    this.url = ENV_CONFIG.SUPABASE_URL;
    this.anonKey = ENV_CONFIG.SUPABASE_ANON_KEY;

    if (this.url && this.anonKey && window.supabase && !this.url.includes('your-project-ref')) {
      try {
        this.client = window.supabase.createClient(this.url, this.anonKey);
      } catch (err) {
        console.warn("Supabase initialization exception:", err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isLiveConnected() {
    return !!this.client;
  }

  // --- SUPABASE AUTHENTICATION METHODS ---
  async signUpUser(email, password, fullName) {
    this.initClient();
    if (this.isLiveConnected()) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, data: data.user };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: true, data: { email, user_metadata: { full_name: fullName } } };
  }

  async signInUser(email, password) {
    this.initClient();
    if (this.isLiveConnected()) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: email,
          password: password
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, data: data.user };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: true, data: { email } };
  }

  // --- DATA ACCESS OPERATIONS ---
  async fetchEvents() {
    this.initClient();

    if (this.isLiveConnected()) {
      try {
        const { data, error } = await this.client
          .from("events")
          .select("*")
          .order("start_date", { ascending: true });

        if (!error && Array.isArray(data)) {
          if (data.length > 0) {
            return data;
          }

          // Auto-seed initial Islamabad tech events into live Supabase if empty
          console.log("Seeding initial Islamabad tech events to live Supabase database...");
          for (const seedEvt of INITIAL_EVENTS) {
            const { id, ...cleanEvt } = seedEvt;
            await this.client.from("events").insert([cleanEvt]);
          }

          const { data: seededData } = await this.client
            .from("events")
            .select("*")
            .order("start_date", { ascending: true });

          if (seededData && seededData.length > 0) {
            return seededData;
          }
        } else if (error) {
          console.warn("Supabase fetch error:", error.message || error);
        }
      } catch (err) {
        console.warn("Supabase query exception:", err);
      }
    }

    return INITIAL_EVENTS;
  }

  async createEvent(eventData) {
    this.initClient();

    if (this.isLiveConnected()) {
      try {
        const { data, error } = await this.client
          .from("events")
          .insert([eventData])
          .select();

        if (!error && data && data.length > 0) {
          console.log("Event saved to live Supabase PostgreSQL database!", data[0]);
          return { success: true, data: data[0] };
        } else if (error) {
          console.warn("Supabase insert error:", error.message || error);
        }
      } catch (err) {
        console.warn("Live Supabase insert exception:", err);
      }
    }

    // Local Fallback Save
    const newEvent = {
      id: "evt-" + Date.now(),
      created_at: new Date().toISOString(),
      ...eventData,
      is_official: true
    };
    const events = await this.fetchEvents();
    events.unshift(newEvent);
    return { success: true, data: newEvent };
  }

  async updateEvent(id, updatedData) {
    this.initClient();

    if (this.isLiveConnected()) {
      try {
        const { data, error } = await this.client
          .from("events")
          .update(updatedData)
          .eq("id", id)
          .select();

        if (!error && data && data.length > 0) {
          return { success: true, data: data[0] };
        }
      } catch (err) {
        console.warn("Supabase update error:", err);
      }
    }

    const events = await this.fetchEvents();
    const index = events.findIndex(e => e.id === id);
    if (index !== -1) {
      events[index] = { ...events[index], ...updatedData };
      return { success: true, data: events[index] };
    }
    return { success: false, error: "Event not found" };
  }

  async deleteEvent(id) {
    this.initClient();

    if (this.isLiveConnected()) {
      try {
        await this.client.from("events").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }

    return { success: true };
  }
}

export const supabaseService = new SupabaseService();
