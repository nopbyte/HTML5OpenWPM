class CommandSequence:

    def __init__(self):
        """Nothing to do here"""
        self.commands = []
        self.url = None

    def get(self, url, timeout=60, reset=False):
        """ goes to a url """
        self.url = url
        command = ('GET', url)
        self.commands.append((command, timeout, reset))

    def browse(self, url, num_links = 2, timeout=60, reset=False):
        self.url = url
        """ browse a website and visit <num_links> links on the page """
        command = ('BROWSE', url, num_links)
        params = (timeout, reset)
        self.commands.append((command, timeout, reset))

    def dump_storage_vectors(self, start_time, timeout=60):
        """ dumps the local storage vectors (flash, localStorage, cookies) to db """
        command = ('DUMP_STORAGE_VECTORS', self.url, start_time)
        reset = False
        self.commands.append((command, timeout, reset))

    def dump_profile(self, dump_folder, close_webdriver=False, compress=True, timeout=120):
        """ dumps from the profile path to a given file (absolute path) """
        command = ('DUMP_PROF', dump_folder, close_webdriver, compress)
        reset = False
        self.commands.append((command, timeout, reset))

    def extract_links(self, timeout=30):
        command = ('EXTRACT_LINKS',)
        reset = False
        self.commands.append((command, timeout, reset))

    def flush(self):
        self.commands = []
        self.url = None
