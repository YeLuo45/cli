import { defineCommand } from '../../command';
import { requestJson } from '../../client/http';
import { vlmEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat, dryRun } from '../../output/formatter';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import { isInteractive } from '../../utils/env';
import { promptText } from '../../utils/prompt';
import { toDataUri } from '../../utils/image';

interface VlmResponse {
  content: string;
}

export default defineCommand({
  name: 'vision describe',
  description: 'Describe an image using MiniMax VLM',
  usage: 'mmx vision describe (--image <path-or-url> | --file-id <id>) [--prompt <text>]',
  options: [
    { flag: '--image <path-or-url>', description: 'Local image path or URL (base64 encoded automatically)' },
    { flag: '--file-id <id>', description: 'Pre-uploaded file ID (skips base64 conversion)' },
    { flag: '--prompt <text>', description: 'Question about the image (default: "Describe the image.")' },
  ],
  examples: [
    'mmx vision describe --image photo.jpg',
    'mmx vision describe --image https://example.com/photo.jpg --prompt "What breed is this dog?"',
    'mmx vision describe --file-id file-123456789 --prompt "Extract the text"',
  ],
  async run(config: Config, flags: GlobalFlags) {
    let image = (flags.image ?? flags.file ?? flags.path ?? (flags._positional as string[]|undefined)?.[0]) as string | undefined;
    let fileId = flags.fileId as string | undefined;
    const prompt = (flags.prompt as string) || 'Describe the image.';

    // Mutually exclusive: must provide one, cannot provide both
    if (!image && !fileId) {
      if (isInteractive({ nonInteractive: config.nonInteractive })) {
        const hint = await promptText({
          message: 'Enter image path, URL, or File ID:',
        });
        if (!hint) {
          process.stderr.write('Vision describe cancelled.\n');
          process.exit(1);
        }
        // Simple heuristic: if no extension and not http(s), treat as fileId
        if (!hint.includes('.') && !hint.startsWith('http')) {
          fileId = hint;
        } else {
          image = hint;
        }
      } else {
        throw new CLIError(
          'Missing required argument. Must provide either --image or --file-id.',
          ExitCode.USAGE,
          'mmx vision describe --image <path> OR --file-id <id>',
        );
      }
    } else if (image && fileId) {
      throw new CLIError(
        'Conflicting arguments: cannot provide both --image and --file-id.',
        ExitCode.USAGE,
      );
    }

    if (dryRun(config, { prompt, image, fileId })) return;

    const format = detectOutputFormat(config.output);
    const url = vlmEndpoint(config.baseUrl);
    const body: Record<string, unknown> = { prompt };

    if (fileId) {
      // Skip base64: pass fileId directly to the API
      body.file_id = fileId;
    } else if (image) {
      // Fallback to base64 encoding for local/HTTP images
      const imageUrl = await toDataUri(image);
      body.image_url = imageUrl;
    }

    const response = await requestJson<VlmResponse>(config, {
      url,
      method: 'POST',
      body,
    });

    if (format !== 'text') {
      process.stdout.write(formatOutput(response, format) + '\n');
      return;
    }

    process.stdout.write(response.content + '\n');
  },
});
