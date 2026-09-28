FROM python:3.12-slim

RUN pip install --no-cache-dir pandas pymupdf requests

WORKDIR /home/user
RUN mkdir -p /home/user/output /home/user/scripts /opt/twenty

COPY docker/kernel.py /opt/twenty/kernel.py
COPY sandbox-scripts/ /home/user/scripts/

CMD ["python", "-u", "/opt/twenty/kernel.py"]
