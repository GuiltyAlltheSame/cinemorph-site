/**
 * Admin composition root: initial UI state, authentication, and first data load.
 * Loaded in the explicit order declared by admin/index.html.
 */

/** Reconciles initial UI state, restores auth, and loads the first dashboard snapshot. */
const initAdmin = async () => {
  setAdminVisibility(false);
  setConnectionStatus("checking", isAuthEnabled() ? "Checking session" : "Checking Supabase");
  setPanel(state.activePanel);
  setMessageFilter(state.messageFilter);
  updateGalleryPreview();
  updateVideoPreview();

  if (!hasSupabaseConfig()) {
    setConnectionStatus("error", "Supabase config missing");
    setAuthError("Supabase config is missing");
    setAdminVisibility(!isAuthEnabled());
    return;
  }

  bindAuthStateChanges();

  const hasSession = await ensureAuthSession();

  if (!hasSession && isAuthEnabled()) {
    dom.loginForm?.elements.email?.focus();
    return;
  }

  await refreshData();
};

initAdmin();
