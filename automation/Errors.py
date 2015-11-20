""" OpenWPM Custom Errors """

class CommandExecutionError(Exception):
    """ Raise for errors related to executing commands """
    def __init__(self, message, command_sequence, *args):
        self.message = message
        self.command_sequence = command_sequence
        super(CommandExecutionError, self).__init__(message, command_sequence, *args)
