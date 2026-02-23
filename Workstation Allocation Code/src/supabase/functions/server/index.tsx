// Minimal edge function - Not used by Workstation Allotment Tracker
// This application uses direct Supabase client connections instead

Deno.serve(async (req) => {
  return new Response(
    JSON.stringify({ 
      message: "This edge function is not used. The Workstation Allotment Tracker uses direct Supabase client connections.",
      status: "inactive"
    }),
    { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
});
