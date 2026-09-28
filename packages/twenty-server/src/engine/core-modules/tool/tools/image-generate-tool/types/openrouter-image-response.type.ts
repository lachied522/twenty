export type OpenRouterImageData = {
  b64_json?: string;
  url?: string;
  media_type?: string;
};

export type OpenRouterImageUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

export type OpenRouterImageResponse = {
  data?: OpenRouterImageData[];
  usage?: OpenRouterImageUsage;
  error?: {
    message?: string;
    code?: number;
  };
};
