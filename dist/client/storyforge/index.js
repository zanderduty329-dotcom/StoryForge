class WorldSession {
  constructor(state, env) {
  }
  async fetch(request) {
    return new Response("WorldSession is running.");
  }
}
const worker = {
  async fetch(request, env) {
    return new Response("StoryForge worker is running.");
  }
};
const workerEntry = worker ?? {};
export {
  WorldSession,
  workerEntry as default
};
