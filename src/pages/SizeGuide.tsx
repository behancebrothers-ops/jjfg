import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SizeGuide = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Size Guide</h1>

        <div className="space-y-8 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>How to Measure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Chest/Bust</h3>
                <p className="text-muted-foreground">
                  Measure around the fullest part of your chest, keeping the tape horizontal.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Waist</h3>
                <p className="text-muted-foreground">
                  Measure around your natural waistline, keeping the tape comfortably loose.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Hips</h3>
                <p className="text-muted-foreground">
                  Measure around the fullest part of your hips, approximately 8" below your waist.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Women's Sizes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Bust (inches)</TableHead>
                    <TableHead>Waist (inches)</TableHead>
                    <TableHead>Hips (inches)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">XS</TableCell>
                    <TableCell>31-32</TableCell>
                    <TableCell>24-25</TableCell>
                    <TableCell>34-35</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">S</TableCell>
                    <TableCell>33-34</TableCell>
                    <TableCell>26-27</TableCell>
                    <TableCell>36-37</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">M</TableCell>
                    <TableCell>35-36</TableCell>
                    <TableCell>28-29</TableCell>
                    <TableCell>38-39</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">L</TableCell>
                    <TableCell>37-39</TableCell>
                    <TableCell>30-32</TableCell>
                    <TableCell>40-42</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">XL</TableCell>
                    <TableCell>40-42</TableCell>
                    <TableCell>33-35</TableCell>
                    <TableCell>43-45</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Men's Sizes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Chest (inches)</TableHead>
                    <TableHead>Waist (inches)</TableHead>
                    <TableHead>Hips (inches)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">S</TableCell>
                    <TableCell>34-36</TableCell>
                    <TableCell>28-30</TableCell>
                    <TableCell>35-37</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">M</TableCell>
                    <TableCell>38-40</TableCell>
                    <TableCell>32-34</TableCell>
                    <TableCell>38-40</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">L</TableCell>
                    <TableCell>42-44</TableCell>
                    <TableCell>36-38</TableCell>
                    <TableCell>41-43</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">XL</TableCell>
                    <TableCell>46-48</TableCell>
                    <TableCell>40-42</TableCell>
                    <TableCell>44-46</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">XXL</TableCell>
                    <TableCell>50-52</TableCell>
                    <TableCell>44-46</TableCell>
                    <TableCell>47-49</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shoe Sizes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Women's Shoes</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>US</TableHead>
                        <TableHead>EU</TableHead>
                        <TableHead>UK</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>5</TableCell>
                        <TableCell>35</TableCell>
                        <TableCell>2.5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>6</TableCell>
                        <TableCell>36</TableCell>
                        <TableCell>3.5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>7</TableCell>
                        <TableCell>37</TableCell>
                        <TableCell>4.5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>8</TableCell>
                        <TableCell>38</TableCell>
                        <TableCell>5.5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>9</TableCell>
                        <TableCell>39</TableCell>
                        <TableCell>6.5</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Men's Shoes</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>US</TableHead>
                        <TableHead>EU</TableHead>
                        <TableHead>UK</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>7</TableCell>
                        <TableCell>40</TableCell>
                        <TableCell>6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>8</TableCell>
                        <TableCell>41</TableCell>
                        <TableCell>7</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>9</TableCell>
                        <TableCell>42</TableCell>
                        <TableCell>8</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>10</TableCell>
                        <TableCell>43</TableCell>
                        <TableCell>9</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>11</TableCell>
                        <TableCell>44</TableCell>
                        <TableCell>10</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SizeGuide;
