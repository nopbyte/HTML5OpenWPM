class CommandSequence:
    """A command sequence should be associated with one top url"""

    def __init__(self, url, reset=False):
        """Nothing to do here"""
        self.prepare_for_new_sequence(url, reset)

    def prepare_for_new_sequence(self, url, reset=False):
        self.commands = []
        self.url = url
        self.reset = reset

    def get(self, timeout=60):
        """ goes to a url """
        command = ('GET', self.url)
        self.commands.append((command, timeout))

    def browse(self, num_links = 2, timeout=60):
        """ browse a website and visit <num_links> links on the page """
        command = ('BROWSE', self.url, num_links)
        self.commands.append((command, timeout))

    def dump_storage_vectors(self, start_time, timeout=60):
        """ dumps the local storage vectors (flash, localStorage, cookies) to db """
        command = ('DUMP_STORAGE_VECTORS', self.url, start_time)
        self.commands.append((command, timeout))

    def dump_profile(self, dump_folder, close_webdriver=False, compress=True, timeout=120):
        """ dumps from the profile path to a given file (absolute path) """
        command = ('DUMP_PROF', dump_folder, close_webdriver, compress)
        self.commands.append((command, timeout))

    def extract_links(self, timeout=30):
        command = ('EXTRACT_LINKS',)
        self.commands.append((command, timeout))
