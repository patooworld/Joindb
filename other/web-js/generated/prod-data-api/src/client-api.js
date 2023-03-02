import jwtDecode from "jwt-decode";

export class ClientApi {
  // static async getAppLocation(appId) {
  //   const resp = await fetch(
  //     `https://realm.mongodb.com/api/client/v2.0/app/${this.appId}/location`
  //   );
  //   if (resp.status === 200) {
  //     const location = await resp.json();
  //     return location;
  //   } else {
  //     throw new ClientApiError(await resp.json());
  //   }
  // }

  // static getLocalCloudRegion(hostname) {
  //   const [region, cloud] = new URL(hostname).host.split(".");
  //   return { region, cloud };
  // }

  static constructBaseUrl(deployment) {
    const { deployment_model, cloud, region } = deployment;
    if (deployment_model === "GLOBAL") {
      return `https://realm.mongodb.com/api/client/v2.0`;
    }
    if (!cloud || !region) {
      throw new Error(
        `Must specify a cloud provider and region for LOCAL Apps. e.g. { "cloud": "aws", "region": "us-east-1" }`
      );
    }
    return `https://${region}.${cloud}.realm.mongodb.com/api/client/v2.0`;
  }

  constructor({ appId, deployment_model, cloud, region, onAuthChange }) {
    this.appId = appId;
    this.credentialStorage = new CredentialStorage(appId);
    this.currentUser = this.credentialStorage.get("currentUser");
    this.deployment = {
      deployment_model:
        deployment_model ?? (cloud || region ? "LOCAL" : "GLOBAL"),
      cloud,
      region,
    };
    this.baseUrl = ClientApi.constructBaseUrl(this.deployment);
    this.onAuthChange = onAuthChange;
  }

  // endpointUrl(path: string): string;
  endpointUrl = (path) => {
    if (!path.startsWith("/")) {
      throw new Error(`Client API path must start with a slash ("/")`);
    }
    const url = new URL(
      `/api/client/v2.0/app/${this.appId}${path}`,
      this.baseUrl
    );
    return url.href;
  };

  setCurrentUser = (user) => {
    this.currentUser = user;
    this.credentialStorage.set("currentUser", this.currentUser);
    this.onAuthChange?.(this.currentUser);
  };

  registerUser = async (provider, credentials) => {
    const url = this.endpointUrl(`/auth/providers/${provider}/register`);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    if (resp.status === 201) {
      // Status 201 means the user was created. There is no response body.
      return;
    } else {
      throw new ClientApiError(await resp.json());
    }
  };

  logIn = async (provider, credentials) => {
    const url = this.endpointUrl(`/auth/providers/${provider}/login`);
    const resp = await fetch(url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    if (resp.status === 200) {
      // Example 200 Response:
      // {
      //   access_token: "eyJhbGciOiJIUzI1NiIsInA5cCI6IkpXVCJ9.eyJiYWFzX2RldmljZV9pZCI6IjYzZjUwNGE3NWRkZTkxZTZmNjBiYTA5YSIsImJhYXNfZG9tYWluX2lkIjoiNWNkYjEyNDA4ZTIzMmFjNGY5NTg3ZmU4IiwiZXhwIjoxNjc3MDAzNjk1LCJpYXQiOjE2NzcwMDE4OTUsImlzcyI6IjYzZjUwNGE3NWRkZTkxZTZmNjBiYTA5ZCIsInN0aXRjaF9kZXZJZCI6IjYzZjUwNGE3NWRkZTkxZTZmNjBiYTA5YSIsInN0aXRjaF9kb21haW5JZCI6IjVjZGIxMjQwOGUyMzJhYzRmOTU4N2ZlOCIsInN1YiI6IjYzZjUwNGE3NWRkZTkxZTZmNjBiYTA5NSIsInR5cCI6ImFjY2VzcyJ9.R9ZazXGPtngBfaMe1nZkKPjvoPRe3GWNfA77UX28ewo",
      //   device_id: "63f504a75dd881f2f58ba09a",
      //   refresh_token: "eyJhbGciOiJIUzI1BiIsInE5cCI6IkpXVCJ9.eyJiYWFzX2RhdGEiOm51bGwsImJhYXNfZGV2aWNlX2lkIjoiNjNmNTA0YTc1ZGRlOTFlNmY2MGJhMDlhIiwiYmFhc19kb21haW5faWQiOiI1Y2RiMTI0MDhlMjMyYWM0Zjk1ODdmZTgiLCJiYWFzX2lkIjoiNjNmNTA0YTc1ZGRlOTFlNmY2MGJhMDlkIiwiYmFhc19pZGVudGl0eSI6eyJpZCI6IjYzZjUwNGE3NWRkZTkxZTZmNjBiYTA5Mi1qenBncGhsY3puZXpxaXJkb3ljemNwc20iLCJwcm92aWRlcl90eXBlIjoiYW5vbi11c2VyIiwicHJvdmlkZXJfaWQiOiI1ZDQ4OTJlMzU1OGViYjk4Y2VkNmU5MWYifSwiZXhwIjozMjUzODAxODk1LCJpYXQiOjE2NzcwMDE4OTUsInN0aXRjaF9kYXRhIjpudWxsLCJzdGl0Y2hfZGV2SWQiOiI2M2Y1MDRhNzVkZGU5MWU2ZjYwYmEwOWEiLCJzdGl0Y2hfZG9tYWluSWQiOiI1Y2RiMTI0MDhlMjMyYWM0Zjk1ODdmZTgiLCJzdGl0Y2hfaWQiOiI2M2Y1MDRhNzVkZGU5MWU2ZjYwYmEwOWQiLCJzdGl0Y2hfaWRlbnQiOnsiaWQiOiI2M2Y1MDRhNzVkZGU5MWU2ZjYwYmEwOTItanpwZ3BobGN6bmV6cWlyZG95Y3pjcHNtIiwicHJvdmlkZXJfdHlwZSI6ImFub24tdXNlciIsInByb3ZpZGVyX2lkIjoiNWQ0ODkyZTM1NThlYmI5OGNlZDZlOTFmIn0sInN1YiI6IjYzZjUwNGE3NWRkZTkxZTZmNjBiYTA5NSIsInR5cCI6InJlZnJlc2gifQ.k1o_4RQ1diSewmXynIqiC0bxVAdvYJmw3L1358T3UJk",
      //   user_id: "63f504a25dde21e6f10ba025"
      // }
      const response = await resp.json();
      this.setCurrentUser({
        id: response.user_id,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });
      return this.currentUser;
    } else {
      throw new ClientApiError(await resp.json());
    }
  };

  logOut = async () => {
    this.setCurrentUser(null);
  };

  refreshExpiredAccessToken = async () => {
    if (!this.currentUser) {
      throw new Error(
        "Must be authenticated to call refreshExpiredAccessToken()"
      );
    }
    const { access_token, refresh_token } = this.currentUser;
    const { exp } = jwtDecode(access_token);
    const now = new Date().getTime() / 1000;
    const hasExpiredAccessToken = now >= exp;
    if (hasExpiredAccessToken) {
      // If the access token has expired then we need to refresh it.
      const refreshed = await this.refreshSession({ refresh_token });
      this.setCurrentUser({
        ...this.currentUser,
        access_token: refreshed.access_token,
      });
    }
    return this.currentUser;
  };

  refreshSession = async ({ refresh_token }) => {
    const url = this.endpointUrl(`/auth/session`);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refresh_token}}`,
      },
    });
    if (resp.status === 200) {
      // Example 200 Response: {
      //   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiYWFzX2RldmljZV9pZCI6IjYzZjUxNWNhNmVmZDZkMjU1OTk5M2U2YiIsImJhYXNfZG9tYWluX2lkIjoiNWNkYjEyNDA4ZTIzMmFjNGY5NTg3ZmU4IiwiZXhwIjoxNjc3MDA5MzI0LCJpYXQiOjE2NzcwMDc1MjQsImlzcyI6IjYzZjUxYTM3ZDI0M2VmZTY1YWFhMGZmZCIsInN0aXRjaF9kZXZJZCI6IjYzZjUxNWNhNmVmZDZkMjU1OTk5M2U2YiIsInN0aXRjaF9kb21haW5JZCI6IjVjZGIxMjQwOGUyMzJhYzRmOTU4N2ZlOCIsInN1YiI6IjYzZjUxNWNhNmVmZDZkMjU1OTk5M2U1ZSIsInR5cCI6ImFjY2VzcyJ9.rbB5ZW8e88P-VKPTYNZYyCM3RKl77FuW_kBf29POr24"
      // }
      return await resp.json();
    } else {
      throw new ClientApiError(await resp.json());
    }
  };

  emailPasswordAuth = {
    registerUser: async ({ email, password }) => {
      return await this.registerUser("local-userpass", { email, password });
    },

    logIn: async ({ email, password }) => {
      return await this.logIn("local-userpass", { email, password });
    },
  };
}

// CredentialStorage is a lightweight wrapper around localStorage that
// lets users stay logged in across page refreshes. You could replace
// this with your own implementation if you wanted to use a different
// storage mechanism.
export class CredentialStorage {
  constructor(id) {
    this.namespace = `@${id}`;
  }
  namespacedKey(key) {
    return `${this.namespace}/${key}`;
  }
  get(key) {
    const data = localStorage.getItem(this.namespacedKey(key));
    return JSON.parse(data);
  }
  set(key, data) {
    localStorage.setItem(this.namespacedKey(key), JSON.stringify(data));
  }
  delete(key) {
    localStorage.removeItem(this.namespacedKey(key));
  }
  clearAll() {
    localStorage.clear();
  }
}

// A wrapper around JavaScript's built-in Error object that represents
// errors returned by the Client API.
// Example error: {
//   error: 'name already in use',
//   error_code: 'AccountNameInUse',
//   link: 'https://realm.mongodb.com/groups/{groupId}/apps/{appId}/logs?co_id=63f506d9d243efe65aa33430'
// }
export class ClientApiError extends Error {
  constructor({ error, error_code, link }) {
    super(error);
    this.name = "ClientApiError";
    this.error = error;
    this.error_code = error_code;
    this.link = link;
  }
}