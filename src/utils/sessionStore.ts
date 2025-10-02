type SessionData = {
  step: string;
  data?: Record<string, any>;
  history?: string[];
};

const sessionStates = new Map<string, SessionData>();

export const sessionStore = {
  async get(sessionid: string): Promise<SessionData | null> {
    return sessionStates.get(sessionid) || null;
  },

  async set(sessionid: string, value: SessionData) {
    sessionStates.set(sessionid, value);
  },

  async delete(sessionid: string) {
    sessionStates.delete(sessionid);
  }
};
