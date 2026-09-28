export const TWENTY_DRIVE_HELPER = `# Auto-injected Twenty Drive helper - pull/publish files in workspace spaces
import os
import requests as _drive_requests

class TwentyDrive:
    """Pull files from Drive into the sandbox and publish artefacts back.

    Virtual paths:
      /personal/...
      /spaces/{slug}/...
      /shared/{itemId}/...  (items shared with you)

    Durable files must land in a space via publish(). /home/user/output is
    only a chat convenience harvest and is cleared every call.

    When you generate a file from a script, publish the generator beside
    the artefact (pass generator_path) so later revisions edit the script
    instead of the binary.
    """

    def __init__(self):
        self.url = os.environ.get('TWENTY_SERVER_URL', '')
        self.token = os.environ.get('TWENTY_DRIVE_TOKEN', '')
        self._available = bool(self.url) and bool(self.token)

    @property
    def available(self) -> bool:
        return self._available

    def pull(self, virtual_path, dest_path):
        """Download a Drive file you can READ into dest_path (READ)."""
        if not self._available:
            raise RuntimeError('Twenty Drive bridge not available. Missing TWENTY_DRIVE_TOKEN.')

        response = _drive_requests.get(
            f'{self.url}/rest/drive/sandbox/pull',
            headers={'Authorization': f'Bearer {self.token}'},
            params={'path': virtual_path},
            timeout=120,
        )
        response.raise_for_status()
        parent = os.path.dirname(dest_path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(dest_path, 'wb') as dest_file:
            dest_file.write(response.content)

    def publish(self, source_path, virtual_path, generator_path=None):
        """Upload a local file to Drive (READ_WRITE on the destination)."""
        if not self._available:
            raise RuntimeError('Twenty Drive bridge not available. Missing TWENTY_DRIVE_TOKEN.')

        with open(source_path, 'rb') as source_file:
            content = source_file.read()

        response = _drive_requests.post(
            f'{self.url}/rest/drive/sandbox/publish',
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/octet-stream',
            },
            params={'path': virtual_path},
            data=content,
            timeout=120,
        )
        response.raise_for_status()

        if generator_path:
            generator_name = os.path.basename(generator_path)
            dest_dir = virtual_path.rsplit('/', 1)[0]
            self.publish(generator_path, f'{dest_dir}/{generator_name}')

drive = TwentyDrive()
`;
