class ProviderError(Exception):
    def __init__(self, provider: str, message: str) -> None:
        super().__init__(message)
        self.provider = provider
        self.message = message


class LocationResolutionError(ProviderError):
    pass
