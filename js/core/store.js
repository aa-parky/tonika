// Minimal observable store with shallow merge updates
export function createStore(initialState = {}) {
  let state = { ...initialState };
  const subs = new Set(); // fn(nextState, prevState)

  function get() {
    return state;
  }

  function set(patch) {
    const prev = state;
    state = {
      ...state,
      ...(typeof patch === "function" ? patch(prev) : patch),
    };
    for (const fn of subs) {
      try {
        fn(state, prev);
      } catch (e) {
        console.error("[Store]", e);
      }
    }
  }

  function subscribe(fn, fireImmediately = false) {
    subs.add(fn);
    if (fireImmediately) fn(state, state);
    return () => subs.delete(fn);
  }

  return { get, set, subscribe };
}
