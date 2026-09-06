export class WorldSession {
  constructor(state: any, env: any) {}

  async fetch(request: Request): Promise<Response> {
    return new Response("WorldSession is running.");
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    return new Response("StoryForge worker is running.");
  },
};
