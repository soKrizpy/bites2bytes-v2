/**
 * Bites2Bytes - Supabase Configuration
 * Centralized client for database and authentication
 */

// Load Supabase via CDN (ensure this script is included before other scripts in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'https://ghrkcyqtnncshpoqxkmj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8GodJfaZr0uk_1vw1-uNYg_si5p74xN';

let supabase = null;

if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    // Retry once or wait forDOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        if (window.supabase && !supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.B2B_Supabase.client = supabase;
        }
    });
}


/**
 * Utility to get current authenticated user profile
 */
async function getCurrentProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
    return profile;
}

/**
 * Real-time Broadcast Listener
 * Usage: subscribeToBroadcasts((msg) => { ... show banner ... })
 */
function subscribeToBroadcasts(callback) {
    return supabase
        .channel('public:broadcasts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, payload => {
            callback(payload.new);
        })
        .subscribe();
}

// Global Exports
window.B2B_Supabase = {
    client: supabase,
    getCurrentProfile,
    subscribeToBroadcasts
};
